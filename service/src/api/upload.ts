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
import { APIController, Auth, BadRequest, BodyProp, Conflict, Forbidden, FormField, NotFound, Post, Security } from "acts-util-apilib";
import { FileUploadReceiver } from "../services/FileUploadReceiver";
import { HTTP } from "acts-util-node";
import { AccessToken, OIDC_API_SCHEME, SCOPE_FILES_WRITE } from "../api_security";
import { FilesController } from "../data-access/FilesController";
import { ContainersController } from "../data-access/ContainersController";

@APIController("upload")
@Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
class _api_
{
    constructor(private fileUploadReceiver: FileUploadReceiver, private filesController: FilesController, private containersController: ContainersController)
    {
    }

    @Post("chunk")
    public async AppendChunk(
        @FormField uploadKey: string,
        @FormField chunk: HTTP.UploadedBlobRef
    )
    {
        const data = await fs.promises.readFile(chunk.filePath);
        await fs.promises.unlink(chunk.filePath);
        const result = this.fileUploadReceiver.AppendChunk(uploadKey, data);
        if(result === "error_unknown_key")
            return BadRequest("illegal upload key");
    }

    @Post("finish")
    public async FinishUpload(
        @BodyProp uploadKey: string
    )
    {
        const result = await this.fileUploadReceiver.FinishUpload(uploadKey);
        if(result === "error_unknown_key")
            return BadRequest("illegal upload key");
    }

    @Post("newfile")
    public async CreateNewFile(
        @BodyProp containerId: number,
        @BodyProp parentPath: string,
        @BodyProp fileName: string,
        @BodyProp mediaType: string,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const container = await this.containersController.Query(containerId);
        if(container === undefined)
            return NotFound("container not found");
        if(!accessToken.containers.includes(container.requiredClaim))
            return Forbidden("you don't have access to that container");

        const result = await this.fileUploadReceiver.InitNewFileUpload(containerId, parentPath, fileName, mediaType);
        if(!result.ok)
            return Conflict("file exists already");
        return result.value;
    }

    @Post("revision")
    public async UploadFileRevision(
        @BodyProp fileId: number,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const file = await this.filesController.Query(fileId);
        if(file === undefined)
            return NotFound("file not found");
        const container = await this.containersController.Query(file.containerId);
        if(container === undefined)
            return NotFound("container not found");
        if(!accessToken.containers.includes(container.requiredClaim))
            return Forbidden("you don't have access to that container");

        const result = await this.fileUploadReceiver.InitNewRevisionUpload(fileId, file.filePath);
        return result;
    }
}