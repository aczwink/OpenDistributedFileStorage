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

import { APIController, Auth, Common, Forbidden, FormField, Get, NotFound, Path, Post, Query, Security } from "acts-util-apilib";
import { AccessToken, OIDC_API_SCHEME, SCOPE_FILES_WRITE } from "../api_security";
import { ContainersController } from "../data-access/ContainersController";
import { FileMetaData, FilesController } from "../data-access/FilesController";
import { FileDownloadService } from "../services/FileDownloadService";
import { FileUploadService } from "../services/FileUploadService";
import { UploadedFile } from "acts-util-node/dist/http/UploadedFile";

@APIController("files/{fileId}")
class _api_
{
    constructor(private containersController: ContainersController, private filesController: FilesController, private fileDownloadService: FileDownloadService,
        private fileUploadService: FileUploadService
    )
    {
    }

    @Common()
    public async CheckContainerAccess(
        @Path fileId: number,
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

        return file;
    }

    @Get()
    public async RequestFile(
        @Common file: FileMetaData
    )
    {
        return file;
    }

    @Get("blob")
    public RequestFileBlob(
        @Common file: FileMetaData
    )
    {
        return this.fileDownloadService.DownloadBlob(file.blobId);
    }

    @Get("revisions")
    public RequestFileRevisions(
        @Common file: FileMetaData
    )
    {
        return this.filesController.QueryRevisions(file.id);
    }

    @Get("revisions/blob")
    public RequestFileRevisionBlob(
        @Common file: FileMetaData,
        @Query blobId: number
    )
    {
        return this.fileDownloadService.DownloadBlob(blobId);
    }

    @Post("revisions")
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async UploadFileRevision(
        @Common fileMetaData: FileMetaData,
        @FormField file: UploadedFile
    )
    {
        await this.fileUploadService.UploadRevision(fileMetaData.id, file.buffer);
    }
}