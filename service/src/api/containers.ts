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

import { APIController, Auth, Body, Common, Conflict, Forbidden, FormField, Get, NotFound, Path, Post, Query, Security } from "acts-util-apilib";
import { AccessToken, OIDC_API_SCHEME, SCOPE_ADMIN, SCOPE_FILES_WRITE } from "../api_security";
import { ContainerProperties, ContainersController } from "../data-access/ContainersController";
import { UploadedFile } from "acts-util-node/dist/http/UploadedFile";
import { FileUploadService } from "../services/FileUploadService";
import { FileOverviewData, FilesController } from "../data-access/FilesController";
import { TagsController } from "../data-access/TagsController";
import { Of } from "acts-util-core";

interface DirectoryContentsDTO
{
    dirs: string[];
    files: FileOverviewData[];
}

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

@APIController("containers/{containerId}")
class _api2_
{
    constructor(private containersController: ContainersController, private filesController: FilesController,
        private tagsController: TagsController
    )
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

    @Get()
    public async Request(
        @Path containerId: number,
    )
    {
        return this.containersController.Query(containerId);
    }

    @Get("search")
    public async SearchForFiles(
        @Path containerId: number,
        @Query dirPath: string,
        @Query nameFilter: string,
        @Query mediaTypeFilter: string,
        @Query requiredTags: string
    )
    {
        const tags = requiredTags.split(",").map(x => x.trim()).filter(x => x.length > 0);
        const tagIds = [];
        for (const tag of tags)
        {
            const tagId = await this.tagsController.QueryTagId(containerId, tag);
            if(tagId === undefined)
                return NotFound("unknown tag: " + tag);
            tagIds.push(tagId);
        }
        return await this.filesController.Search(containerId, dirPath, nameFilter.toLowerCase(), mediaTypeFilter, tagIds);
    }
}

@APIController("containers/{containerId}/files")
class _api3_
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
        @FormField parentPath: string,
        @FormField file: UploadedFile
    )
    {
        const result = await this.fileUploadService.Upload(containerId, parentPath, file.originalName, file.mediaType, file.buffer);
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
        const files = await this.filesController.QueryDirectChildrenOf(containerId, dirPath);
        const dirs = await this.filesController.QueryNextLabelChildrenOf(containerId, dirPath);

        return Of<DirectoryContentsDTO>({
            files,
            dirs
        });
    }
}