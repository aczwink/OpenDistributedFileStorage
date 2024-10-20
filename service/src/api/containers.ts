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

import { APIController, Auth, Body, Common, Conflict, Forbidden, FormField, Get, NotFound, Path, Post, Query, Security } from "acts-util-apilib";
import { AccessToken, OIDC_API_SCHEME, SCOPE_ADMIN, SCOPE_FILES_WRITE } from "../api_security";
import { ContainerProperties, ContainersController } from "../data-access/ContainersController";
import { UploadedFile } from "acts-util-node/dist/http/UploadedFile";
import { FileUploadService } from "../services/FileUploadService";
import { FilesController } from "../data-access/FilesController";

@APIController("containers")
class _api_
{
    constructor(private containersController: ContainersController)
    {
    }

    @Post()
    @Security(OIDC_API_SCHEME, [SCOPE_ADMIN])
    public Create(
        @Body data: ContainerProperties
    )
    {
        return this.containersController.Create(data);
    }
    
    @Get()
    public async RequestAll(
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const containers = await this.containersController.QueryAll();
        return containers.Values().Filter(x => accessToken.containers.Contains(x.requiredClaim)).ToArray();
    }
}

@APIController("containers/{containerId}/files")
class _api2_
{
    constructor(private containersController: ContainersController, private fileUploadService: FileUploadService, private filesController: FilesController)
    {
    }

    @Common()
    public async CheckContainerAccess(
        @Path containerId: number,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const container = await this.containersController.Query(containerId);
        if(container === undefined)
            return NotFound("container not found");
        if(!accessToken.containers.includes(container.requiredClaim))
            return Forbidden("you don't have access to that container");
    }

    @Post()
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async Create(
        @Path containerId: number,
        @FormField file: UploadedFile
    )
    {
        const result = await this.fileUploadService.Upload(containerId, file.originalName, file.mediaType, file.buffer);
        if(result === "error_file_exists")
            return Conflict("file exists already");
        return result;
    }

    @Get()
    public async RequestDirContents(
        @Path containerId: number,
        @Query dirPath: string
    )
    {
        return await this.filesController.QueryChildrenOf(containerId, dirPath);
    }
}