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
import { Readable } from "stream";
import { Injectable, Promisify } from "acts-util-node";
import { BlobsController, BlobStorageInfoEntry } from "../data-access/BlobsController";
import { StorageBlocksManager } from "./StorageBlocksManager";
import { AccessCounterService } from "./AccessCounterService";

@Injectable
export class FileDownloadService
{
    constructor(private blobsController: BlobsController, private storageBackendsManager: StorageBlocksManager, private accessCounterService: AccessCounterService)
    {
    }

    //Public methods
    public async DownloadBlob(blobId: number, userId: string)
    {
        this.accessCounterService.AddBlobAccess(userId, blobId);

        const size = await this.blobsController.QueryBlobSize(blobId);

        const entries = await this.blobsController.QueryBlobStorageInfo(blobId);
        let index = 0;
        const context = this;
        const stream = new Readable({
            async read()
            {
                const entry = entries[index++];
                const next = (entry === undefined) ? null : await context.DownloadPart(entry);
                this.push(next);
            },
        })

        return {
            stream,
            size: size!
        };
    }

    public async DownloadBlobOntoLocalFileSystem(blobId: number, userId: string, filePath: string)
    {
        const result = await this.DownloadBlob(blobId, userId);
        
        const pipe = result.stream.pipe(fs.createWriteStream(filePath));
        await Promisify(pipe);
    }

    public async DownloadBlobSlice(blobId: number, offset: number, length: number)
    {
        const entries = await this.blobsController.QueryBlobStorageInfo(blobId);
        const matchingEntries = entries.Values().Map(x => this.ComputeOverlap(offset, length, x)).Filter(x => x.size > 0).ToArray();
        const buffers = await matchingEntries.Values().Map(this.DownloadPart.bind(this)).PromiseAll();

        return Buffer.concat(buffers);
    }

    //Private methods
    private ComputeOverlap(offset: number, length: number, entry: BlobStorageInfoEntry): BlobStorageInfoEntry
    {
        function ClampToBlock(offset: number)
        {
            const notNegative = Math.max(offset, 0);
            const notPastEnd = Math.min(notNegative, entry.size);

            return notPastEnd;
        }

        const relativeOffset = offset - entry.offset;
        const relativeEnd = relativeOffset + length;

        const startOffset = ClampToBlock(relativeOffset);
        return {
            offset: startOffset,
            size: ClampToBlock(relativeEnd) - startOffset,
            storageBlockId: entry.storageBlockId,
            storageBlockOffset: entry.storageBlockOffset + startOffset
        };
    }

    private async DownloadPart(part: BlobStorageInfoEntry)
    {
        const storageBlock = await this.storageBackendsManager.DownloadStorageBlock(part.storageBlockId);
        return storageBlock.subarray(part.storageBlockOffset, part.storageBlockOffset + part.size);
    }
}