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
import { Readable } from 'stream';
import { Injectable } from "acts-util-node";
import { BlobsController } from "../data-access/BlobsController";
import { StorageBlocksManager } from "./StorageBlocksManager";
import { CONST_BLOCKSIZE } from "../constants";
import { FilesController } from "../data-access/FilesController";
import { JobOrchestrationService } from "./JobOrchestrationService";

@Injectable
export class FileUploadService
{
    constructor(private blobsController: BlobsController, private storageBackendsManager: StorageBlocksManager, private filesController: FilesController,
        private jobOrchestrationService: JobOrchestrationService
    )
    {
    }

    //Public methods
    public async Upload(containerId: number, originalName: string, mediaType: string, buffer: Buffer)
    {
        const blobId = await this.ProcessBlob(Readable.from(buffer));
        let fileId;
        try
        {
            fileId = await this.filesController.AddFile(containerId, originalName, mediaType);
        }
        catch(e: any)
        {
            if(e?.code === "ER_DUP_ENTRY")
                return "error_file_exists";
            throw e;
        }
        await this.filesController.AddRevision(fileId, blobId);

        this.OnFileBlobChanged(fileId);

        return fileId;
    }

    public async UploadBlob(buffer: Buffer)
    {
        const blobId = await this.ProcessBlob(Readable.from(buffer));
        return blobId;
    }

    public async UploadRevision(fileId: number, buffer: Buffer)
    {
        const blobId = await this.ProcessBlob(Readable.from(buffer));
        await this.filesController.AddRevision(fileId, blobId);

        this.OnFileBlobChanged(fileId);
    }

    //Private methods
    private async FindOrCreateBlob(sha256sum: string, blockIds: number[])
    {
        const blobId = await this.blobsController.FindBlobByHash(sha256sum);
        if(blobId !== undefined)
            return blobId;

        const newBlobId = await this.blobsController.AddBlob(sha256sum, blockIds);
        return newBlobId;
    }

    private ProcessBlob(stream: Readable)
    {
        const blockIdsPromises: Promise<number>[] = [];

        let currentChunksSize = 0;
        let chunks: Buffer[] = [];

        const hasher = crypto.createHash("sha256");

        const context = this;
        function emitBlock()
        {
            const nextBlock = Buffer.concat(chunks);
            currentChunksSize = 0;
            chunks = [];

            blockIdsPromises.push(context.ProcessBlobBlock(nextBlock));
        }
        
        function addChunk(chunk: Buffer)
        {
            const leftSize = CONST_BLOCKSIZE - currentChunksSize;
            if(chunk.byteLength > leftSize)
            {
                const tail = chunk.subarray(0, leftSize);
                chunks.push(tail);
            
                emitBlock();
            
                addChunk(chunk.subarray(leftSize));
            }
            else if(leftSize === chunk.byteLength)
            {
                chunks.push(chunk);
                emitBlock();
            }
            else
            {
                chunks.push(chunk);
                currentChunksSize += chunk.byteLength;
            }
        }

        return new Promise<number>(resolve => {
            stream.on("data", chunk => {
                hasher.update(chunk);
                addChunk(chunk);
            });
            stream.on("end", async () => {
                if(currentChunksSize > 0)
                    emitBlock();

                const blockIds = await Promise.all(blockIdsPromises);
                resolve(await this.FindOrCreateBlob(hasher.digest("hex"), blockIds));
            });
        });
    }

    private async ProcessBlobBlock(blobBlock: Buffer)
    {
        const sha256sum = crypto.createHash("sha256").update(blobBlock).digest("hex");
        return this.ProcessBlobBlockHashed(blobBlock, sha256sum);
    }

    private async ProcessBlobBlockHashed(blobBlock: Buffer, sha256sum: string): Promise<number>
    {
        const blockId = await this.blobsController.FindBlobBlock(blobBlock.byteLength, sha256sum);
        if(blockId !== undefined)
        {
            console.log("found");
            return blockId;
        }

        let newBlockId;
        try
        {
            newBlockId = await this.blobsController.AddBlobBlock(blobBlock.byteLength, sha256sum);
            console.log("added blob block", newBlockId, blobBlock.byteLength, sha256sum);
        }
        catch(e: any)
        {
            console.log("error", e);
            if(e?.code === "ER_DUP_ENTRY")
                return await this.ProcessBlobBlockHashed(blobBlock, sha256sum);
            throw e;
        }
        console.log("adding", newBlockId);
        const storageBlock = await this.storageBackendsManager.StoreBlobBlock(blobBlock);
        await this.blobsController.AddBlobBlockStorage(newBlockId, storageBlock.id, storageBlock.offset);
        console.log("added", newBlockId, storageBlock.id, storageBlock.offset);

        return newBlockId;
    }

    //Event handlers
    private async OnFileBlobChanged(fileId: number)
    {
        const md = await this.filesController.Query(fileId);
        const mediaType = md!.mediaType;

        if(mediaType.startsWith("audio/") || mediaType.startsWith("image/") || mediaType.startsWith("video/"))
        {
            this.jobOrchestrationService.ScheduleJob({
                type: "compute-thumbs",
                fileId: fileId
            });
        }
    }
}