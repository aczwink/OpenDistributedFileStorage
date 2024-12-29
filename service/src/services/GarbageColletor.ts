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
import { Injectable } from "acts-util-node";
import { GarbageCollectionController } from "../data-access/GarbageCollectionController";
import { FilesController } from "../data-access/FilesController";
import { BlobsController } from "../data-access/BlobsController";
import { StorageBlocksManager } from "./StorageBlocksManager";

@Injectable
export class GarbageColletor
{
    constructor(private garbageCollectionController: GarbageCollectionController, private filesController: FilesController, private blobsController: BlobsController,
        private storageBlocksManager: StorageBlocksManager
    )
    {
    }

    public async Execute()
    {
        const fileIds = await this.garbageCollectionController.FindSoftDeletedFilesThatShouldBeHardDeleted();
        for (const fileId of fileIds)
            await this.filesController.DeleteFile(fileId);

        const blobIds = await this.garbageCollectionController.FindUnreferencedBlobs();
        for (const blobId of blobIds)
            await this.blobsController.DeleteBlob(blobId);

        const blobBlockIds = await this.garbageCollectionController.FindUnreferencedBlobBlocks();
        for (const blobBlockId of blobBlockIds)
            await this.garbageCollectionController.DeleteBlobBlock(blobBlockId);

        const storageBlockIds = await this.garbageCollectionController.FindUnreferencedStorageBlocks();
        for (const storageBlockId of storageBlockIds)
            await this.storageBlocksManager.FreeUnreferencedStorageBlock(storageBlockId);
    }
}