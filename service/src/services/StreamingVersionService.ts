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
import fs from "fs";
import path from "path";
import { Injectable } from "acts-util-node";
import { StreamingVersionType } from "../BackgroundJob";
import { FileDownloadService } from "./FileDownloadService";
import { CommandExecutor } from "./CommandExecutor";
import { BlobVersionsController } from "../data-access/BlobVersionsController";
import { FileUploadService } from "./FileUploadService";
import { CONST_SERVICE_USER_FAKEID } from "../constants";

@Injectable
export class StreamingVersionService
{
    constructor(private fileDownloadService: FileDownloadService, private commandExecutor: CommandExecutor,
        private blobVersionsController: BlobVersionsController, private fileUploadService: FileUploadService
    )
    {
    }

    //Public methods
    public async Compute(blobId: number, targetType: StreamingVersionType)
    {
        let tmpDir;
        try
        {
            tmpDir = await fs.promises.mkdtemp("/tmp/oos");

            const blob = await this.fileDownloadService.DownloadBlob(blobId, CONST_SERVICE_USER_FAKEID);
            const inputPath = path.join(tmpDir, "__input");
            await fs.promises.writeFile(inputPath, blob);

            await this.Process(inputPath, targetType);
        }
        finally
        {
            if(tmpDir !== undefined)
                await fs.promises.rm(tmpDir, { recursive: true });
        }
    }

    //Private methods
    private MapTypeToHeight(targetType: StreamingVersionType)
    {
        switch(targetType)
        {
            case "360p":
                return 360;
            case "480p":
                return 480;
        }
    }

    private async Process(inputPath: string, targetType: StreamingVersionType)
    {
        const dirPath = path.dirname(inputPath);
        const targetPath = path.join(dirPath, "__output.mp4");

        const vfilterParams = [
            "-filter:v", "scale=-2:" + this.MapTypeToHeight(targetType) + ",setsar=1:1"
        ];

        const vcodecParams = [
            "-vcodec", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "high",
            "-preset", "medium",
            "-crf", "23" //TODO: right quality
        ];
        const acodecParams = [
            "-acodec", "aac",
            "-b:a", "128k"
        ];
        const formatParams = ["-movflags", "+faststart"];

        const command = [
            "ffmpeg",
            "-i", inputPath,
            ...vfilterParams,
            ...vcodecParams,
            ...acodecParams,
            ...formatParams,
            targetPath
        ];
        await this.commandExecutor.Execute(command);

        const result = await this.fileUploadService.UploadBlobFromDisk(targetPath);
        await this.blobVersionsController.AddVersion(result.blobId, "stream_" + targetType);
    }
}