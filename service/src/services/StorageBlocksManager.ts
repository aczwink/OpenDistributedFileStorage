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
import path from "path";
import { Injectable, Lock } from "acts-util-node";
import { CONST_BLOCKSIZE, CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR, CONST_STORAGEBLOCKS_MAX_REPLICATION } from "../constants";
import { StorageBlocksController } from "../data-access/StorageBlocksController";
import { StorageEncryptionManager } from "./StorageEncryptionManager";
import { StorageBackendsManager } from "./StorageBackendsManager";
import { StorageBlocksCache } from "./StorageBlocksCache";
import { JobOrchestrationService } from "./JobOrchestrationService";

/*
Special care needs to be taken into account for residual blocks as these can be mutated until they are full.
Thus they can not be read and written to at the same time from/to storage backends.

For simplicity reasons, the current implementation allows only a single operation to be executed at a time over all residual blocks, which is obviously way too strict.
*/

@Injectable
export class StorageBlocksManager
{
    constructor(private storageBlocksController: StorageBlocksController, private storageEncryptionManager: StorageEncryptionManager,
        private storageBackendsManager: StorageBackendsManager, private storageBlocksCache: StorageBlocksCache,
        private jobOrchestrationService: JobOrchestrationService
    )
    {
        this.residualBlocksLock = new Lock;
    }

    //Public methods
    public async DownloadStorageBlock(storageBlockId: number)
    {
        const isResidual = await this.storageBlocksController.IsResidualBlock(storageBlockId);
        if(isResidual)
        {
            const releaser = await this.residualBlocksLock.Lock();
            const result = await this.DownloadStorageBlockImpl(storageBlockId);
            releaser.Release();
            return result;
        }

        return this.DownloadStorageBlockImpl(storageBlockId);
    }

    public async Replicate(storageBlockId: number)
    {
        const storageBackendIds = await this.storageBlocksController.QueryBlockLocations(storageBlockId);
        if(storageBackendIds.length >= CONST_STORAGEBLOCKS_MAX_REPLICATION)
            return;

        const replicationBackends = this.storageBackendsManager.FindReplicationBackends(storageBackendIds).ToArray();
        if(replicationBackends.length > 0)
        {
            const isResidual = await this.storageBlocksController.IsResidualBlock(storageBlockId);
            let releaser;
            if(isResidual)
                releaser = await this.residualBlocksLock.Lock();
            
            const encryptedBlock = await this.DownloadEncryptedStorageBlock(storageBlockId);
            for (const replicationBackend of replicationBackends)
            {
                const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
                await replicationBackend.instance.CreateDirectoryIfNotExisting(path.dirname(storageBlockPath));
                await replicationBackend.instance.StoreFile(storageBlockPath, encryptedBlock);
                await this.storageBlocksController.AddBlockLocation(storageBlockId, replicationBackend.id);
            }

            releaser?.Release();
        }
    }

    public async StoreBlobBlock(blobBlock: Buffer)
    {
        let result;
        if(blobBlock.byteLength === CONST_BLOCKSIZE)
        {
            const storageBlockId = await this.storageBlocksController.CreateBlock();
            result = await this.StoreBlock({ id: storageBlockId, offset: 0 }, blobBlock);
        }
        else
        {
            const releaser = await this.residualBlocksLock.Lock();

            const storageBlock = await this.FindResidualStorageBlock(blobBlock.byteLength);
            result = await this.StoreBlock(storageBlock, blobBlock);
            this.storageBlocksCache.RemoveFromCache(storageBlock.id); //old version still in cache

            releaser.Release();
        }

        this.jobOrchestrationService.ScheduleJob({
            type: "replicate",
            storageBlockId: result.id
        });

        return result;
    }

    //Private methods
    private async DownloadEncryptedStorageBlock(storageBlockId: number)
    {
        const backend = await this.storageBackendsManager.FindFastestBackendForReading(storageBlockId);

        const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
        const read = await backend.ReadFile(storageBlockPath);

        return read;
    }

    private async DownloadStorageBlockImpl(storageBlockId: number)
    {
        const cached = this.storageBlocksCache.TryServe(storageBlockId);
        if(cached !== undefined)
            return cached;

        const read = await this.DownloadEncryptedStorageBlock(storageBlockId);
        const encryptionInfo = await this.storageBlocksController.QueryEncryptionInfo(storageBlockId);
        const decrypted = await this.storageEncryptionManager.Decrypt(this.GetPartitionNumber(storageBlockId), read, encryptionInfo!.iv, encryptionInfo!.authTag);

        this.storageBlocksCache.AddToCache(storageBlockId, decrypted);
        return decrypted;
    }

    private FetchStorageBlockPath(storageBlockId: number)
    {
        const partitionNumber = this.GetPartitionNumber(storageBlockId);

        const dirName = partitionNumber.toString();
        const dirPath = "/" + dirName;

        return path.join(dirPath, storageBlockId.toString())
    }

    private async FindResidualStorageBlock(byteSize: number)
    {
        const storageBlock = await this.storageBlocksController.FindResidualBlock(byteSize);
        if(storageBlock === undefined)
        {
            const newBlockId = await this.storageBlocksController.CreateResidualBlock(CONST_BLOCKSIZE - byteSize);
            return {
                id: newBlockId,
                offset: 0
            };
        }
        else
        {
            const offset = CONST_BLOCKSIZE - storageBlock.leftSize;
            await this.storageBlocksController.ReduceLeftSizeOfResidualBlock(storageBlock.storageBlockId, storageBlock.leftSize - byteSize);
            return {
                id: storageBlock.storageBlockId,
                offset
            };
        }
    }

    private GetPartitionNumber(storageBlockId: number)
    {
        const partitionNumber = storageBlockId / CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR;
        return Math.floor(partitionNumber);
    }

    private async StoreBlock(storageBlock: { id: number; offset: number; }, blobBlock: Buffer)
    {
        const backend = this.storageBackendsManager.FindFastestBackendForWriting();
        const backendInstance = backend.instance;

        const storageBlockPath = this.FetchStorageBlockPath(storageBlock.id);
        await backendInstance.CreateDirectoryIfNotExisting(path.dirname(storageBlockPath));

        let targetBuffer;        
        if(storageBlock.offset === 0)
            targetBuffer = blobBlock;
        else
        {
            const decrypted = await this.DownloadStorageBlockImpl(storageBlock.id);
            if(storageBlock.offset < decrypted.byteLength)
                throw new Error("SHOULD NEVER HAPPEN!");
            else if(storageBlock.offset > decrypted.byteLength)
            {
                //happens when storing a block raises an error but the leftSize in db already changed. clearly a programming error. should be fixed
                const diff = storageBlock.offset - decrypted.byteLength;
                blobBlock = Buffer.concat([Buffer.alloc(diff), blobBlock]); //insert padding
            }
            targetBuffer = Buffer.concat([decrypted, blobBlock]);

        }
        const partitionNumber = this.GetPartitionNumber(storageBlock.id);
        const encryptionResult = await this.storageEncryptionManager.Encrypt(partitionNumber, targetBuffer);
        await backendInstance.StoreFile(storageBlockPath, encryptionResult.encrypted);
        await this.storageBlocksController.UpdateEncryptionInfo(storageBlock.id, encryptionResult.iv, encryptionResult.authTag);

        await this.storageBlocksController.UpdateBlockLocation(storageBlock.id, backend.id);

        return storageBlock;
    }

    //State
    private residualBlocksLock: Lock;
}