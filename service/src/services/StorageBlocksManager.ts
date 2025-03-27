/**
 * OpenDistributedFileStorage
 * Copyright (C) 2024-2025 Amir Czwink (amir130@hotmail.de)
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
import { CONST_BLOCKSIZE, CONST_NUMBER_OF_STORAGE_BLOCKS_COMBINATION_THRESHOLD, CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR, CONST_STORAGEBLOCKS_MAX_REPLICATION } from "../constants";
import { ResidualBlock, StorageBlocksController } from "../data-access/StorageBlocksController";
import { StorageEncryptionManager } from "./StorageEncryptionManager";
import { StorageBackendsManager } from "./StorageBackendsManager";
import { StorageBlocksCache } from "./StorageBlocksCache";
import { JobOrchestrationService } from "./JobOrchestrationService";
import { BlobsController } from "../data-access/BlobsController";
import { NumberDictionary } from "acts-util-core";

@Injectable
export class StorageBlocksManager
{
    constructor(private storageBlocksController: StorageBlocksController, private storageEncryptionManager: StorageEncryptionManager,
        private storageBackendsManager: StorageBackendsManager, private storageBlocksCache: StorageBlocksCache,
        private jobOrchestrationService: JobOrchestrationService, private blobsController: BlobsController
    )
    {
        this.inFlightRequests = {};
        this.storageBlockAcquirementLock = new Lock;
    }

    //Public methods
    public async CombineResidualBlocks()
    {
        const residualBlocks = await this.storageBlocksController.QueryResidualBlocksOrderedBySizeDescending();
        if(residualBlocks.length < CONST_NUMBER_OF_STORAGE_BLOCKS_COMBINATION_THRESHOLD)
            return;

        for(let i = 0; i < residualBlocks.length; i++)
        {
            const combined = this.TryFindCombinationPermutation(residualBlocks.slice(i));
            if(combined.length > 1)
            {
                await this.CreateCombinedBlock(combined);
                break;
            }
        }
    }

    public async DownloadStorageBlock(storageBlockId: number)
    {
        const cached = this.storageBlocksCache.TryServe(storageBlockId);
        if(cached !== undefined)
            return cached;

        const inFlightRequest = this.inFlightRequests[storageBlockId];
        if(inFlightRequest !== undefined)
            return inFlightRequest;

        const promise = this.DownloadAndDecryptStorageBlock(storageBlockId);
        this.inFlightRequests[storageBlockId] = promise;

        const result = await promise;
        this.inFlightRequests[storageBlockId] = undefined;

        return result;
    }

    public async FreeUnreferencedStorageBlock(storageBlockId: number)
    {
        await this.RemoveStorageBlockFromAllLocations(storageBlockId);
        await this.storageBlocksController.FreeBlock(storageBlockId);
    }

    public async Replicate(storageBlockId: number)
    {
        const storageBackendIds = await this.storageBlocksController.QueryBlockLocations(storageBlockId);
        if(storageBackendIds.length >= CONST_STORAGEBLOCKS_MAX_REPLICATION)
            return;

        const replicationBackends = this.storageBackendsManager.FindReplicationBackends(storageBackendIds).ToArray();
        if(replicationBackends.length > 0)
        {
            if(storageBackendIds.length === 0)
            {
                if(await this.storageBlocksController.IsBlockOnFreeList(storageBlockId))
                {
                    //before it could be replicated it actually got merged. nothing left to be done here
                    return;
                }
                throw new Error("This situation should never happen!!!");
            }

            const encryptedBlock = await this.DownloadEncryptedStorageBlock(storageBlockId);
            for (const replicationBackend of replicationBackends)
            {
                const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
                await replicationBackend.instance.CreateDirectoryIfNotExisting(path.dirname(storageBlockPath));
                await replicationBackend.instance.StoreFile(storageBlockPath, encryptedBlock);
                await this.storageBlocksController.AddBlockLocation(storageBlockId, replicationBackend.id);
            }
        }
    }

    public async StoreBlobBlock(blobBlock: Buffer)
    {
        const storageBlockId = await this.AcquireStorageBlock();
        await this.WriteStorageBlock(storageBlockId, blobBlock);

        return {
            id: storageBlockId,
            offset: 0
        };
    }

    //Private methods
    private async AcquireStorageBlock()
    {
        const releaser = await this.storageBlockAcquirementLock.Lock();

        const storageBlockId = await this.storageBlocksController.TryRemoveStorageBlockFromFreeList();
        if(storageBlockId !== null)
        {
            releaser.Release();
            return storageBlockId;
        }

        const newStorageBlockId = await this.storageBlocksController.CreateBlock();

        releaser.Release();

        return newStorageBlockId;
    }

    private async CreateCombinedBlock(sourceBlocks: ResidualBlock[])
    {
        const buffers = [];
        const blockOffsetDelta = new Map<ResidualBlock, number>();
        let offset = 0;
        for (const sourceBlock of sourceBlocks)
        {
            blockOffsetDelta.set(sourceBlock, offset);

            const buffer = await this.DownloadStorageBlock(sourceBlock.storageBlockId);
            buffers.push(buffer);

            offset += buffer.byteLength;
        }

        const combinedBuffer = Buffer.concat(buffers);

        const newStorageBlockId = await this.AcquireStorageBlock();
        await this.WriteStorageBlock(newStorageBlockId, combinedBuffer);

        for (const sourceBlock of sourceBlocks)
        {
            const offsetDelta = blockOffsetDelta.get(sourceBlock)!;

            const refs = await this.blobsController.QueryBlobBlocksInStorageBlock(sourceBlock.storageBlockId);
            for (const ref of refs)
                await this.blobsController.AddBlobBlockStorage(ref.blobBlockId, newStorageBlockId, ref.storageBlockOffset + offsetDelta);
            await this.blobsController.RemoveReferencesToStorageBlockId(sourceBlock.storageBlockId);
        }

        this.jobOrchestrationService.ScheduleJob({
            type: "collect-garbage",
        });
    }

    private async DownloadAndDecryptStorageBlock(storageBlockId: number)
    {
        const read = await this.DownloadEncryptedStorageBlock(storageBlockId);
        const encryptionInfo = await this.storageBlocksController.QueryEncryptionInfo(storageBlockId);
        const decrypted = await this.storageEncryptionManager.Decrypt(this.GetPartitionNumber(storageBlockId), read, encryptionInfo!.iv, encryptionInfo!.authTag);

        this.storageBlocksCache.AddToCache(storageBlockId, decrypted);
        return decrypted;
    }

    private async DownloadEncryptedStorageBlock(storageBlockId: number)
    {
        const backend = await this.storageBackendsManager.FindFastestBackendForReading(storageBlockId);

        const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
        const read = await backend.ReadFile(storageBlockPath);

        return read;
    }

    private FetchStorageBlockPath(storageBlockId: number)
    {
        const partitionNumber = this.GetPartitionNumber(storageBlockId);

        const dirName = partitionNumber.toString();
        const dirPath = "/" + dirName;

        return path.join(dirPath, storageBlockId.toString())
    }

    private GetPartitionNumber(storageBlockId: number)
    {
        const partitionNumber = storageBlockId / CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR;
        return Math.floor(partitionNumber);
    }

    private async RemoveStorageBlockFromAllLocations(storageBlockId: number)
    {
        const storageBackendIds = await this.storageBlocksController.QueryBlockLocations(storageBlockId);
        for (const storageBackendId of storageBackendIds)
        {
            const backend = this.storageBackendsManager.GetBackendById(storageBackendId);
            if(backend === undefined)
                return;
            const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
            await backend.instance.DeleteFile(storageBlockPath);
            await this.storageBlocksController.RemoveBlockLocation(storageBlockId, storageBackendId);
        }
    }

    private TryFindCombinationPermutation(residualBlocks: ResidualBlock[])
    {
        let total = 0;
        const blocks: ResidualBlock[] = [];

        for (const residualBlock of residualBlocks)
        {
            const mergedSize = total + residualBlock.size;
            if(mergedSize <= CONST_BLOCKSIZE)
            {
                blocks.push(residualBlock);
                total += residualBlock.size;
            }
        }

        return blocks;
    }

    private async WriteStorageBlock(storageBlockId: number, data: Buffer)
    {
        const backend = this.storageBackendsManager.FindFastestBackendForWriting();
        const backendInstance = backend.instance;

        const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
        await backendInstance.CreateDirectoryIfNotExisting(path.dirname(storageBlockPath));

        const partitionNumber = this.GetPartitionNumber(storageBlockId);
        const encryptionResult = await this.storageEncryptionManager.Encrypt(partitionNumber, data);
        await backendInstance.StoreFile(storageBlockPath, encryptionResult.encrypted);

        await this.storageBlocksController.UpdateStorageBlockInfo(storageBlockId, data.byteLength, encryptionResult.iv, encryptionResult.authTag);
        await this.storageBlocksController.AddBlockLocation(storageBlockId, backend.id);

        if(data.byteLength < CONST_BLOCKSIZE)
        {
            await this.storageBlocksController.PutOnResidualList(storageBlockId);

            const count = await this.storageBlocksController.QueryResidualBlockCount();
            if(count > CONST_NUMBER_OF_STORAGE_BLOCKS_COMBINATION_THRESHOLD)
            {
                this.jobOrchestrationService.ScheduleJob({
                    type: "combine-residual-blocks",
                });
            }
        }

        this.storageBlocksCache.RemoveFromCache(storageBlockId); //old version might still be in cache

        this.jobOrchestrationService.ScheduleJob({
            type: "replicate",
            storageBlockId
        });
    }

    //State
    private inFlightRequests: NumberDictionary<Promise<Buffer>>;
    private storageBlockAcquirementLock: Lock;
}