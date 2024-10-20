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
import path from "path";
import { Injectable, Lock } from "acts-util-node";
import { CONST_BLOCKSIZE, CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR } from "../constants";
import { StorageBlocksController } from "../data-access/StorageBlocksController";
import { StorageEncryptionManager } from "./StorageEncryptionManager";
import { StorageBackendsManager } from "./StorageBackendsManager";

/*
Special care needs to be taken into account for residual blocks as these can be mutated until they are full.
Thus they can not be read and written to at the same time from/to storage backends.

For simplicity reasons, the current implementation allows only a single operation to be executed at a time over all residual blocks, which is obviously way too strict.
*/

@Injectable
export class StorageBlocksManager
{
    constructor(private storageBlocksController: StorageBlocksController, private storageEncryptionManager: StorageEncryptionManager,
        private storageBackendsManager: StorageBackendsManager
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

    public async StoreBlobBlock(blobBlock: Buffer)
    {
        if(blobBlock.byteLength === CONST_BLOCKSIZE)
        {
            const storageBlockId = await this.storageBlocksController.CreateBlock();

            return await this.StoreBlock({ id: storageBlockId, offset: 0 }, blobBlock);
        }
        else
        {
            const releaser = await this.residualBlocksLock.Lock();

            const storageBlock = await this.FindResidualStorageBlock(blobBlock.byteLength);
            const result = await this.StoreBlock(storageBlock, blobBlock);

            releaser.Release();
        
            return result;
        }
    }

    //Private methods
    private async DownloadStorageBlockImpl(storageBlockId: number)
    {
        const backend = this.storageBackendsManager.FindFastestBackendForReading();

        const storageBlockPath = this.FetchStorageBlockPath(storageBlockId);
        const read = await backend.ReadFile(storageBlockPath);

        const encryptionInfo = await this.storageBlocksController.QueryEncryptionInfo(storageBlockId);
        const decrypted = await this.storageEncryptionManager.Decrypt(this.GetPartitionNumber(storageBlockId), read, encryptionInfo!.iv, encryptionInfo!.authTag);

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
            await this.storageBlocksController.ReduceLeftSizeOfResidualBlock(storageBlock.storageBlockId, storageBlock.leftSize - byteSize);
            return {
                id: storageBlock.storageBlockId,
                offset: CONST_BLOCKSIZE - storageBlock.leftSize
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

        const partitionNumber = this.GetPartitionNumber(storageBlock.id);
        const storageBlockPath = this.FetchStorageBlockPath(storageBlock.id);

        await backend.CreateDirectoryIfNotExisting(path.dirname(storageBlockPath));

        let targetBuffer;        
        if(storageBlock.offset === 0)
            targetBuffer = blobBlock;
        else
        {
            const decrypted = await this.DownloadStorageBlockImpl(storageBlock.id);
            targetBuffer = Buffer.concat([decrypted, blobBlock]);

        }
        const encryptionResult = await this.storageEncryptionManager.Encrypt(partitionNumber, targetBuffer);
        await backend.StoreFile(storageBlockPath, encryptionResult.encrypted);
        await this.storageBlocksController.UpdateEncryptionInfo(storageBlock.id, encryptionResult.iv, encryptionResult.authTag);

        return storageBlock;
    }

    //State
    private residualBlocksLock: Lock;
}