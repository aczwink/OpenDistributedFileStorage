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

import { APIController, Auth, BadRequest, Body, BodyProp, Common, Forbidden, Get, NotFound, Ok, Path, Post, Put, Query, Request, Security } from "acts-util-apilib";
import { AccessToken, OIDC_API_SCHEME, SCOPE_FILES_WRITE } from "../api_security";
import { ContainersController } from "../data-access/ContainersController";
import { FileMetaData, FilesController } from "../data-access/FilesController";
import { FileDownloadService } from "../services/FileDownloadService";
import { Of } from "acts-util-core";
import { GeoLocationWithSource, TagsController } from "../data-access/TagsController";
import { BlobVersionsController } from "../data-access/BlobVersionsController";
import { StreamingVersionType } from "../BackgroundJob";
import { JobOrchestrationService } from "../services/JobOrchestrationService";
import { StreamingService } from "../services/StreamingService";
import { HTTP } from "acts-util-node";
import { FFProbeService } from "../services/FFProbeService";
import { AccessCounterService } from "../services/AccessCounterService";
import { BlobsController } from "../data-access/BlobsController";
import { AudioMetadataTaggingService, AudioMetadataTags } from "../services/AudioMetadataTaggingService";
import { ImageMetadataService } from "../services/ImageMetadataService";
import { GeocodingService } from "../services/GeocodingService";

interface FileMetaDataDTO extends FileMetaData
{
    location?: GeoLocationWithSource;
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
        private tagsController: TagsController, private fileVersionsController: BlobVersionsController,
        private jobOrchestrationService: JobOrchestrationService, private streamingService: StreamingService, private ffprobeService: FFProbeService,
        private accessCounterService: AccessCounterService, private blobsController: BlobsController, private audioMetadataService: AudioMetadataTaggingService,
        private imageMetadataService: ImageMetadataService, private geocodingService: GeocodingService
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
            location: await this.tagsController.QueryFileLocation(file.id),
            tags: await this.tagsController.QueryFileTags(file.id),
            ...file
        });
    }

    @Put()
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async UpdateFileMetadata(
        @Common fileMetaData: FileMetaData,
        @BodyProp tags: string[],
        @BodyProp filePath: string,
        @BodyProp osmLocationId: string | null,
    )
    {
        await this.filesController.UpdatePath(fileMetaData.id, filePath);
        await this.tagsController.UpdateFileTags(fileMetaData.id, tags);

        if(osmLocationId === null)
            await this.tagsController.UpdateFileLocation(fileMetaData.id, null);
        else
        {
            const location = await this.geocodingService.ResolveLocation(osmLocationId);
            if(location === undefined)
                return BadRequest("illegal location id");

            await this.tagsController.UpdateFileLocation(fileMetaData.id, {
                countryCode: location.address.country_code.toUpperCase(),
                lat: parseFloat(location.latitude),
                lon: parseFloat(location.longitude),
                osmId: osmLocationId
            });
        }
    }

    @Get("access")
    public RequestAccessStatistics(
        @Common file: FileMetaData,
    )
    {
        const counts = this.accessCounterService.FetchFileAccessCounts(file.id);
        return counts;
    }

    @Get("blob")
    public async RequestFileBlob(
        @Common file: FileMetaData,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const rev = await this.filesController.QueryNewestRevision(file.id);
        const result = await this.fileDownloadService.DownloadBlob(rev!.blobId, accessToken.sub);
        return Ok(result.stream, {
            "Content-Length": result.size,
        });
    }

    @Get("meta-file-manager")
    public async RequestFileManagerMetaData(
        @Common fileMetaData: FileMetaData,
    )
    {
        const revs = await this.filesController.QueryRevisions(fileMetaData.id);
        const newestRev = revs[revs.length - 1];
        const size = await this.blobsController.QueryBlobSize(newestRev.blobId);

        return {
            blobId: newestRev.blobId,
            creationTime: revs[0].creationTimestamp,
            lastAccessedTime: this.accessCounterService.FetchLastAccessTime(newestRev.blobId),
            lastModifiedTime: newestRev.creationTimestamp,
            size: size!,
        };
    }

    @Get("meta")
    public async RequestInFileMetadata(
        @Common fileMetaData: FileMetaData,
    )
    {
        const rev = await this.filesController.QueryNewestRevision(fileMetaData.id);
        const blobId = rev!.blobId;

        const tags = await this.audioMetadataService.FetchTags(blobId);
        if(tags !== undefined)
            return tags;

        const tags2 = await this.imageMetadataService.FetchTags(blobId);
        if(tags2 !== undefined)
            return tags2;
        
        return NotFound("no tags available for this file");
    }

    @Post("meta")
    public async UpdateInFileMetadata(
        @Common fileMetaData: FileMetaData,
        @Body audioMetadataTags: AudioMetadataTags,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        await this.audioMetadataService.CreateRevisionWithNewTags(fileMetaData.id, audioMetadataTags, accessToken.sub);
    }

    @Get("revisions")
    public RequestFileRevisions(
        @Common file: FileMetaData
    )
    {
        return this.filesController.QueryRevisions(file.id);
    }

    @Get("revisions/blob")
    public async RequestFileRevisionBlob(
        @Common file: FileMetaData,
        @Query blobId: number,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const result = await this.fileDownloadService.DownloadBlob(blobId, accessToken.sub);
        return Ok(result.stream, {
            "Content-Length": result.size,
        });
    }

    @Post("stream")
    public async RequestStreamingKey(
        @Common fileMetaData: FileMetaData,
        @Request request: HTTP.Request,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const rev = await this.filesController.QueryNewestRevision(fileMetaData.id);
        const blobId = rev!.blobId;

        const versions = await this.fileVersionsController.QueryVersions(blobId);

        const options = versions.Values().Filter(x => x.title.startsWith("stream_")).Map(x => ({
            blobId: x.versionBlobId,
            mediaType: "video/mp4",
            quality: x.title.substring("stream_".length) as StreamingVersionType,
        })).ToArray();

        const streamableBlobIds = options.Values().Map(x => x.blobId).ToArray();
        streamableBlobIds.push(blobId); //the newest revision can always be accepted to be streamed (i.e. binary stream instead of video stream)

        const avData = await this.blobsController.QueryMetaData(blobId, "av");
        if((avData !== undefined) && this.ffprobeService.IsStreamable(fileMetaData.mediaType, JSON.parse(avData)))
        {
            options.push({
                blobId,
                mediaType: fileMetaData.mediaType,
                quality: "Original" as any
            });
        }

        const streamingKey = this.streamingService.CreateStreamingKey(accessToken.sub, accessToken.exp, request.ip, streamableBlobIds);

        return Of<StreamingRequestResultDTO>({
            streamingKey,
            options
        });
    }

    @Get("versions")
    public async RequestFileVersions(
        @Common file: FileMetaData
    )
    {
        const rev = await this.filesController.QueryNewestRevision(file.id);
        return await this.fileVersionsController.QueryVersions(rev!.blobId);
    }

    @Get("versions/blob")
    public async RequestFileVersionBlob(
        @Common file: FileMetaData,
        @Query blobId: number,
        @Auth("jwt") accessToken: AccessToken
    )
    {
        const result = await this.fileDownloadService.DownloadBlob(blobId, accessToken.sub);
        return Ok(result.stream, {
            "Content-Length": result.size,
        });
    }

    @Post("versions")
    @Security(OIDC_API_SCHEME, [SCOPE_FILES_WRITE])
    public async RequestFileVersionCreation(
        @Common fileMetaData: FileMetaData,
        @BodyProp type: StreamingVersionType,
    )
    {
        const rev = await this.filesController.QueryNewestRevision(fileMetaData.id);

        this.jobOrchestrationService.ScheduleJob({
            type: "compute-streaming-version",
            blobId: rev!.blobId,
            targetType: type
        });
    }
}