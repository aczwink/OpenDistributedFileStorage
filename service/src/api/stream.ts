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

import { APIController, Forbidden, Get, Header, Query, Request } from "acts-util-apilib";
import { HTTP } from "acts-util-node";
import { StreamingService } from "../services/StreamingService";
import { FileDownloadService } from "../services/FileDownloadService";
import { PartialContent } from "acts-util-apilib/dist/Responses";
import { BlobsController } from "../data-access/BlobsController";

@APIController("stream")
class _api_
{
    constructor(private streamingService: StreamingService, private fileDownloadService: FileDownloadService, private blobsController: BlobsController)
    {
    }

    @Get()
    public async StreamBlob(
        @Query blobId: number,
        @Query streamingKey: string,
        @Request request: HTTP.Request,
        @Header Range?: string
    )
    {
        const userId = this.streamingService.Authenticate(streamingKey, blobId, request.ip);
        if(userId === null)
            return Forbidden("access denied");

        if(Range === undefined)
        {
            const blob = await this.fileDownloadService.DownloadBlob(blobId, userId);
            return blob;
        }

        this.streamingService.InformAboutPartialAccess(streamingKey, blobId, userId);

        const totalSize = await this.blobsController.QueryBlobSize(blobId);
        const parsed = this.ParseRangeHeader(Range, totalSize!);

        const slice = await this.fileDownloadService.DownloadBlobSlice(blobId, parsed.start, parsed.length);
        return PartialContent(slice, {
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${parsed.start}-${parsed.end}/${totalSize}`,
            "Content-Length": slice.byteLength,
            "Content-Type": {
                mediaType: "video/mp4"
            },
        });
    }

    //Private methods
    private ParseRangeHeader(rangeHeader: string, totalSize: number)
    {
        const chunkSize = 4 * 1024 * 1024; //4 MiB

        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const inclusiveEnd = parts[1] ? parseInt(parts[1], 10) : (start + chunkSize - 1);
        const rangedEnd = Math.min(inclusiveEnd, totalSize - 1);

        return {
            start,
            length: rangedEnd - start + 1,
            end: rangedEnd
        };
    }
}