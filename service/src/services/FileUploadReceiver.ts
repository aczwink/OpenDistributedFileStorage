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
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Injectable, Promisify } from "acts-util-node";
import { FilesController } from "../data-access/FilesController";
import { CreateError, Result } from "../Errorhandling";
import { Dictionary } from "acts-util-core";
import { CONFIG_UPLOADDIR } from "../env";
import { JobOrchestrationService } from "./JobOrchestrationService";

interface UploadState
{
    containerId: number;
    containerPath: string;
    fileId?: number;
    mediaType: string;

    uploadedFilePath: string;
    uploadStream: fs.WriteStream;
}

@Injectable
export class FileUploadReceiver
{
    constructor(private filesController: FilesController, private jobOrchestrationService: JobOrchestrationService)
    {
        this.uploadKeys = {};
    }

    //Public methods
    public AppendChunk(uploadKey: string, chunk: Buffer)
    {
        const state = this.uploadKeys[uploadKey];
        if(state === undefined)
            return "error_unknown_key";
        state.uploadStream.write(chunk);
    }

    public async FinishUpload(uploadKey: string)
    {
        const state = this.uploadKeys[uploadKey];
        if(state === undefined)
            return "error_unknown_key";

        state.uploadStream.end();
        await Promisify(state.uploadStream);

        this.jobOrchestrationService.ScheduleJob({
            type: "upload-file",
            containerId: state.containerId,
            containerPath: state.containerPath,
            fileId: state.fileId,
            mediaType: state.mediaType,
            uploadPath: state.uploadedFilePath
        });

        delete this.uploadKeys[uploadKey];
    }

    public async InitNewFileUpload(containerId: number, parentPath: string, fileName: string, mediaType: string): Promise<Result<string, "file_exists">>
    {
        const containerPath = path.join(parentPath, fileName);
        const id = await this.filesController.FindIdByName(containerId, containerPath);
        if(id !== undefined)
            return CreateError("file_exists");

        return {
            ok: true,
            value: this.InitUpload(containerId, containerPath, mediaType)
        };
    }

    public async InitNewRevisionUpload(fileId: number, filePath: string)
    {
        const fileMetaData = (await this.filesController.Query(fileId))!;

        return this.InitUpload(fileMetaData.containerId, fileMetaData.filePath, fileMetaData.mediaType, fileId);
    }

    //Private methods
    private InitUpload(containerId: number, containerPath: string, mediaType: string, fileId?: number)
    {
        const uploadKey = crypto.randomUUID();
        const tempPath = path.join(CONFIG_UPLOADDIR, uploadKey);
        this.uploadKeys[uploadKey] = {
            containerId,
            containerPath,
            fileId,
            mediaType,
            uploadedFilePath: tempPath,
            uploadStream: fs.createWriteStream(tempPath)
        };

        return uploadKey as string;
    }

    //State
    private uploadKeys: Dictionary<UploadState>;
}