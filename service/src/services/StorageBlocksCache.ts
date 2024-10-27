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

import { Dictionary, ObjectExtensions } from "acts-util-core";
import { Injectable } from "acts-util-node";

interface CachedEntry
{
    buffer: Buffer;
    lastAccess: number;
}

const maxBlocksInCache = 100; //TODO: make this configurable

/**
 * This is a read-only cache. It is never written to.
 * Should only be used within StorageBlocksManager
 */
@Injectable
export class StorageBlocksCache
{
    constructor()
    {
        this.decryptedStorageBlocks = {};
    }

    //Public methods
    public AddToCache(storageBlockId: number, decrypted: Buffer)
    {
        this.PruneCacheIfFull();
        this.decryptedStorageBlocks[storageBlockId] = {
            buffer: decrypted,
            lastAccess: Date.now()
        };
    }

    public RemoveFromCache(storageBlockId: number)
    {
        delete this.decryptedStorageBlocks[storageBlockId];
    }

    public TryServe(storageBlockId: number)
    {
        const entry = this.decryptedStorageBlocks[storageBlockId];
        if(entry !== undefined)
            entry.lastAccess = Date.now();
        return entry?.buffer;
    }

    //Private methods
    private PruneCacheIfFull()
    {
        const pruneCount = ObjectExtensions.OwnKeys(this.decryptedStorageBlocks).Count() - maxBlocksInCache;
        if(pruneCount <= 0)
            return;
        const toPrune = ObjectExtensions.Entries(this.decryptedStorageBlocks).OrderBy(kv => kv.value!.lastAccess).Map(kv => kv.key).Take(pruneCount);
        for (const storageBlockId of toPrune)
            this.RemoveFromCache(storageBlockId as number);
    }

    //State
    private decryptedStorageBlocks: Dictionary<CachedEntry>;
}