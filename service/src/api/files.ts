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

import { APIController, Auth, Body, BodyProp, Common, Forbidden, FormField, Get, NotFound, Path, Post, Put, Query, Request, Security } from "acts-util-apilib";
import { AccessToken, OIDC_API_SCHEME, SCOPE_FILES_WRITE } from "../api_security";
import { ContainersController } from "../data-access/ContainersController";
import { FileMetaData, FilesController } from "../data-access/FilesController";
import { FileDownloadService } from "../services/FileDownloadService";
import { FileUploadService } from "../services/FileUploadService";
import { UploadedFile } from "acts-util-node/dist/http/UploadedFile";
import { Of } from "acts-util-core";
import { TagsController } from "../data-access/TagsController";
import { FileVersionsController } from "../data-access/FileVersionsController";
import { StreamingVersionType } from "../BackgroundJob";
import { JobOrchestrationService } from "../services/JobOrchestrationService";
import { StreamingService } from "../services/StreamingService";
import { HTTP } from "acts-util-node";
import { FFProbeService } from "../services/FFProbeService";
import { AccessCounterService } from "../services/AccessCounterService";
import { BlobsController } from "../data-access/BlobsController";
import { AudioMetadataTaggingService, AudioMetadataTags } from "../services/AudioMetadataTaggingService";

interface FileMetaDataDTO extends FileMetaData
{   
    tags: string[];
}

interface StreamingRequestResultDTO
{
    streamingKey: string;
    options: {
        blobId: number;
        mediaType: string;
        quality: StreamingVersionType | "Original";
    }[];
}

@APIController("files/{fileId}")
class _api_
{
    constructor(private containersController: ContainersController, private filesController: FilesController, private fileDownloadService: FileDownloadService,
        private fileUploadService: FileUploadService, private tagsController: TagsController, private fileVersionsController: FileVersionsController,
        private jobOrchestrationService: JobOrchestrationService, private streamingService: StreamingService, private ffprobeService: FFProbeService,
        private accessCounterService: AccessCounterService, private blobsController: BlobsController, private audioMetadataService: AudioMetadataTaggingService
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
        return Of<FileMetaDataDTO>({
            tags: await this.tagsController.QueryFileTags(file.id),
            ...file
        });
    }

    @Get("blob")
    public async RequestFileBlob(
        @Common file: FileMetaData,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        this.accessCounterService.Add(accessToken.sub, file.id);

        const rev = await this.filesController.QueryNewestRevision(file.id);
        return this.fileDownloadService.DownloadBlob(rev!.blobId);
    }

    @Get("meta")
    public async RequestInFileMetadata(
        @Common fileMetaData: FileMetaData,
    )
    {
        const rev = await this.filesController.QueryNewestRevision(fileMetaData.id);
        const blobId = rev!.blobId;

        const tags = await this.audioMetadataService.FetchTags(blobId);
        if(tags === undefined)
            return NotFound("no tags available for this file");
        return tags;
    }

    @Post("meta")
    public async UpdateInFileMetadata(
        @Common fileMetaData: FileMetaData,
        @Body audioMetadataTags: AudioMetadataTags
    )
    {
        await this.audioMetadataService.CreateRevisionWithNewTags(fileMetaData.id, audioMetadataTags);
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

    @Post("stream")
    public async RequestStreamingKey(
        @Common fileMetaData: FileMetaData,
        @Request request: HTTP.Request,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        this.accessCounterService.Add(accessToken.sub, fileMetaData.id);

        const versions = await this.fileVersionsController.QueryVersions(fileMetaData.id);

        const options = versions.Values().Filter(x => x.title.startsWith("stream_")).Map(x => ({
            blobId: x.blobId,
            mediaType: "video/mp4",
            quality: x.title.substring("stream_".length) as StreamingVersionType,
        })).ToArray();

        const rev = await this.filesController.QueryNewestRevision(fileMetaData.id);
        const blobId = rev!.blobId;

        const avData = await this.blobsController.QueryMetaData(blobId, "av");
        if((avData !== undefined) && this.ffprobeService.IsStreamable(fileMetaData.mediaType, JSON.parse(avData)))
        {
            options.push({
                blobId,
                mediaType: fileMetaData.mediaType,
                quality: "Original" as any
            });
        }

        const blobIds = options.Values().Map(x => x.blobId).ToArray();
        const streamingKey = this.streamingService.CreateStreamingKey(accessToken.sub, accessToken.exp, request.ip, blobIds);

        return Of<StreamingRequestResultDTO>({
            streamingKey,
            options
        });
    }

    @Put("tags")
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async UpdateTags(
        @Common fileMetaData: FileMetaData,
        @Body tags: string[]
    )
    {
        await this.tagsController.UpdateFileTags(fileMetaData.id, tags);
    }

    @Get("versions")
    public RequestFileVersions(
        @Common file: FileMetaData
    )
    {
        return this.fileVersionsController.QueryVersions(file.id);
    }

    @Get("versions/blob")
    public RequestFileVersionBlob(
        @Common file: FileMetaData,
        @Query blobId: number
    )
    {
        return this.fileDownloadService.DownloadBlob(blobId);
    }

    @Post("versions")
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async UploadFileVersion(
        @Common fileMetaData: FileMetaData,
        @BodyProp type: StreamingVersionType,
    )
    {
        this.jobOrchestrationService.ScheduleJob({
            type: "compute-streaming-version",
            fileId: fileMetaData.id,
            targetType: type
        });
    }
}