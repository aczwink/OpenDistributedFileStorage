/**
 * OpenDistributedFileStorage
 * Copyright (C) 2024 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
import "dotenv/config";
import fs from "fs";
import http from "http";
import { AbsURL, OpenAPI } from "acts-util-core";
import { Factory, GlobalInjector, HTTP } from "acts-util-node";
import { APIRegistry } from "acts-util-apilib";
import { DBConnectionsManager } from "./data-access/DBConnectionsManager";
import { CONFIG_AUDIENCE, CONFIG_OIDP_ENDPOINT, CONFIG_ORIGIN, CONFIG_PORT, CONFIG_ROOTDIR, CONFIG_UPLOADDIR } from "./env";
import { StorageBackendsManager } from "./services/StorageBackendsManager";
import { MessagingService } from "./services/MessagingService";
import { JobOrchestrationService } from "./services/JobOrchestrationService";
import { StreamingVersionService } from "./services/StreamingVersionService";
import { ThumbnailService } from "./services/ThumbnailService";
import { StreamingService } from "./services/StreamingService";
import { AccessCounterService } from "./services/AccessCounterService";
import { StorageBlocksManager } from "./services/StorageBlocksManager";
import { FileUploadProcessor } from "./services/FileUploadProcessor";
import { GarbageColletor } from "./services/GarbageColletor";

const crashDetectionPath = CONFIG_ROOTDIR + "/crash_check";

async function DownloadPublicKey()
{
    const sender = new HTTP.RequestSender();
    const response = await sender.SendRequest({
        body: Buffer.alloc(0),
        headers: {
            "Content-Type": "application/json"
        },
        method: "GET",
        url: new AbsURL({
            host: CONFIG_OIDP_ENDPOINT.split(":")[0],
            path: "/jwks",
            port: parseInt(CONFIG_OIDP_ENDPOINT.split(":")[1]),
            protocol: "https",
            queryParams: {},
        })
    });
    
    const string = response.body.toString("utf-8");

    return JSON.parse(string);
}

async function BootstrapServer()
{
    const requestHandlerChain = Factory.CreateRequestHandlerChain(CONFIG_UPLOADDIR);
    requestHandlerChain.AddCORSHandler([CONFIG_ORIGIN]);
    requestHandlerChain.AddBodyParser();

    const jwtVerifier = new HTTP.JWTVerifier(
        await DownloadPublicKey(),
        "https://" + CONFIG_OIDP_ENDPOINT,
        CONFIG_AUDIENCE,
        true
    );
    const streamingService = GlobalInjector.Resolve(StreamingService);
    requestHandlerChain.AddRequestHandler({
        async HandleRequest(request)
        {
            if(request.routePath.startsWith("/stream?"))
                return null;
            const result = await jwtVerifier.HandleRequest(request);
            if(result !== null)
                return result;
            streamingService.Invalidate(request.headers.authorization!);
            return null;
        },
    });

    await import("./__http_registry");

    await GlobalInjector.Resolve(StorageBackendsManager).Reload();

    //make sure some services are instantiated because they do stuff on startup
    GlobalInjector.Resolve(AccessCounterService);
    GlobalInjector.Resolve(MessagingService);

    const jobOrchestrator = GlobalInjector.Resolve(JobOrchestrationService);
    jobOrchestrator.handler = async function(job)
    {
        switch(job.type)
        {
            case "collect-garbage":
                await GlobalInjector.Resolve(GarbageColletor).Execute();
                break;
            case "combine-residual-blocks":
                await GlobalInjector.Resolve(StorageBlocksManager).CombineResidualBlocks();
                break;
            case "compute-streaming-version":
                await GlobalInjector.Resolve(StreamingVersionService).Compute(job.blobId, job.targetType);
                break;
            case "compute-thumbs":
                await GlobalInjector.Resolve(ThumbnailService).Compute(job.blobId, job.mediaType);
                break;
            case "replicate":
                await GlobalInjector.Resolve(StorageBlocksManager).Replicate(job.storageBlockId);
                break;
            case "upload-file":
                await GlobalInjector.Resolve(FileUploadProcessor).UploadFileFromDisk(job.containerId, job.containerPath, job.mediaType, job.uploadPath, job.fileId);
                break;
        }
    };
    setTimeout(() => {
        jobOrchestrator.StartWorker();
    }, 1000);

    const openAPIDef: OpenAPI.Root = (await import("../dist/openapi.json")) as any;
    const backendStructure: any = await import("../dist/openapi-structure.json");
    requestHandlerChain.AddRequestHandler(new HTTP.RouterRequestHandler(openAPIDef, backendStructure, APIRegistry.endPointTargets));

    const server = http.createServer(requestHandlerChain.requestListener);

    server.listen(CONFIG_PORT, () => {
        console.log("Server is running...");
    });

    process.on('SIGINT', function()
    {
        console.log("Shutting server down...");
        GlobalInjector.Resolve(DBConnectionsManager).Close();
        GlobalInjector.Resolve(MessagingService).Close();
        fs.unlinkSync(crashDetectionPath);
        server.close();
    });
}

function BootstrapService()
{
    if(fs.existsSync(crashDetectionPath))
    {
        console.log("Service did crash :S");
        process.exit(1);
        return;
    }
    process.on("uncaughtException", (error, origin) => {
        console.log("Unhandled exception: ", error, origin);
    });
    process.on("unhandledRejection", (reason, promise) => {
        console.log("Unhandled rejection: ", reason, promise);
    });
    fs.writeFileSync(crashDetectionPath, "");

    BootstrapServer();
}

BootstrapService();