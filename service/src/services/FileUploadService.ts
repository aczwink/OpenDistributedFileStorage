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
import { Readable } from 'stream';
import { Injectable } from "acts-util-node";
import { BlobsController } from "../data-access/BlobsController";
import { StorageBlocksManager } from "./StorageBlocksManager";
import { CONST_BLOCKSIZE } from "../constants";
import { FilesController } from "../data-access/FilesController";
import { JobOrchestrationService } from "./JobOrchestrationService";
import { StreamToBuffer } from "acts-util-node/dist/fs/Util";

@Injectable
export class FileUploadService
{
    constructor(private blobsController: BlobsController, private storageBackendsManager: StorageBlocksManager, private filesController: FilesController,
        private jobOrchestrationService: JobOrchestrationService
    )
    {
    }

    //Public methods
    public async CreateUploadJob(containerId: number, parentPath: string, originalName: string, mediaType: string, uploadPath: string)
    {
        const containerPath = path.join(parentPath, originalName);
        const id = await this.filesController.FindIdByName(containerId, containerPath);
        if(id !== undefined)
            return "error_file_exists";

        this.jobOrchestrationService.ScheduleJob({
            type: "upload-file",
            containerId,
            containerPath,
            mediaType,
            uploadPath
        });
    }

    public async CreateUploadRevisionJob(fileId: number, uploadPath: string)
    {
        const fileMetaData = await this.filesController.Query(fileId);

        this.jobOrchestrationService.ScheduleJob({
            type: "upload-file",
            containerId: fileMetaData!.containerId,
            containerPath: fileMetaData!.filePath,
            fileId,
            mediaType: fileMetaData!.mediaType,
            uploadPath
        });
    }

    public async UploadBlobFromDisk(filePath: string)
    {
        return await this.ProcessFile(filePath);
    }

    public async UploadFileFromDisk(containerId: number, containerPath: string, mediaType: string, uploadPath: string, fileId?: number)
    {
        const result = await this.UploadBlobFromDisk(uploadPath);
        if(fileId === undefined)
        {
            fileId = await this.filesController.AddFile(containerId, containerPath, mediaType);
        }
        await this.filesController.AddRevision(fileId, result.blobId);

        if(result.isNew)
            this.OnNewFileBlobUploaded(result.blobId, mediaType);

        await fs.promises.unlink(uploadPath);
    }

    public async UploadRevision(fileId: number, buffer: Buffer)
    {
        const result = await this.ProcessStreamInParallel(Readable.from(buffer));
        await this.filesController.AddRevision(fileId, result.blobId);

        if(result.isNew)
        {
            const md = await this.filesController.Query(fileId);
            this.OnNewFileBlobUploaded(result.blobId, md!.mediaType);
        }
    }

    //Private methods
    private async FindOrCreateBlob(sha256sum: string, blockIds: number[])
    {
        const blobId = await this.blobsController.FindBlobByHash(sha256sum);
        if(blobId !== undefined)
            return { blobId, isNew: false };

        const newBlobId = await this.blobsController.AddBlob(sha256sum, blockIds);
        return { blobId: newBlobId, isNew: true };
    }

    private async ProcessFile(filePath: string)
    {
        const stats = await fs.promises.stat(filePath);

        const hasher = crypto.createHash("sha256");

        const blockIds = [];
        for(let blockCounter = 0; true; blockCounter++)
        {
            const start = blockCounter * CONST_BLOCKSIZE;
            const end = start + CONST_BLOCKSIZE - 1;
            if(start > stats.size)
                break;

            const stream = fs.createReadStream(filePath, { start, end });
            const buffer = await StreamToBuffer(stream);
            const blockId = await this.ProcessBlobBlock(buffer);
            hasher.update(buffer);
            blockIds.push(blockId);
        }

        return await this.FindOrCreateBlob(hasher.digest("hex"), blockIds);
    }

    private ProcessStreamInParallel(stream: Readable)
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

        return new Promise<{ blobId: number; isNew: boolean; }>(resolve => {
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
        return await this.ProcessBlobBlockHashed(blobBlock, sha256sum);
    }

    private async ProcessBlobBlockHashed(blobBlock: Buffer, sha256sum: string): Promise<number>
    {
        const blockId = await this.blobsController.FindBlobBlock(blobBlock.byteLength, sha256sum);
        if(blockId !== undefined)
            return blockId;

        let newBlockId;
        try
        {
            newBlockId = await this.blobsController.AddBlobBlock(blobBlock.byteLength, sha256sum);
        }
        catch(e: any)
        {
            if(e?.code === "ER_DUP_ENTRY")
                return await this.ProcessBlobBlockHashed(blobBlock, sha256sum);
            console.log("error", e);
            throw e;
        }
        const storageBlock = await this.storageBackendsManager.StoreBlobBlock(blobBlock);
        await this.blobsController.AddBlobBlockStorage(newBlockId, storageBlock.id, storageBlock.offset);

        return newBlockId;
    }

    //Event handlers
    private async OnNewFileBlobUploaded(blobId: number, mediaType: string)
    {
        if(mediaType.startsWith("audio/") || mediaType.startsWith("image/") || mediaType.startsWith("video/"))
        {
            this.jobOrchestrationService.ScheduleJob({
                type: "compute-thumbs",
                blobId,
                mediaType,
            });
        }
    }
}