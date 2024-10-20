/**
 * OpenObjectStorage
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
import crypto from "crypto";
import "dotenv/config";
import http from "http";

import { AbsURL, OpenAPI } from "acts-util-core";
import { Factory, GlobalInjector, HTTP } from "acts-util-node";
import { APIRegistry } from "acts-util-apilib";
import { DBConnectionsManager } from "./data-access/DBConnectionsManager";
import { CONFIG_OIDP_ENDPOINT, CONFIG_ORIGIN, CONFIG_PORT } from "./config";
import { FtpSrv, GeneralError } from "ftp-srv";
import { FTPFileSystem } from "./FTPFileSystem";
import { StorageBackendsManager } from "./services/StorageBackendsManager";

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
    const parsed = JSON.parse(string);

    return parsed.keys[0];
}

async function BootstrapServer()
{
    const requestHandlerChain = Factory.CreateRequestHandlerChain();
    requestHandlerChain.AddCORSHandler([CONFIG_ORIGIN]);
    requestHandlerChain.AddBodyParser();

    requestHandlerChain.AddRequestHandler(new HTTP.JWTVerifier(
        crypto.createPublicKey({
            key: await DownloadPublicKey(),
            format: 'jwk'
        }),
        "http://" + CONFIG_OIDP_ENDPOINT, //TODO WHY HTTP AND NOT HTTPS?
        true
    ));

    await import("./__http_registry");

    await GlobalInjector.Resolve(StorageBackendsManager).Reload();

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
        server.close();
    });
}

function BootstrapFTPServer()
{
    const port = 8888;
    const ftpServer = new FtpSrv({
        url: "ftp://0.0.0.0:" + port,
        anonymous: true,
    });

    ftpServer.on('login', ({ connection, username, password }, resolve, reject) => { 
        if(username === 'anonymous' && password === '@anonymous'){
            return resolve({
                fs: new FTPFileSystem(connection, {
                    cwd: "/",
                    root: "/"
                }),
                cwd: "/",
                root: "/"
            });
        }
        return reject(new GeneralError('Invalid username or password', 401));
    });
    
    ftpServer.listen().then(() => { 
        console.log('Ftp server is starting...')
    });
}

BootstrapServer();
BootstrapFTPServer();