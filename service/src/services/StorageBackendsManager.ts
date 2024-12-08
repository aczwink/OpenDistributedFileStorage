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
import { StorageBackend } from "../storage-backends/StorageBackend";
import { StorageBackendsController } from "../data-access/StorageBackendsController";
import { StorageBackendConfig } from "../storage-backends/StorageBackendConfig";
import { HostFileSystemBackend } from "../storage-backends/HostFileSystemBackend";
import { SMBBackend } from "../storage-backends/SMBBackend";
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { StorageBlocksController } from "../data-access/StorageBlocksController";
import { CONST_STORAGEBLOCKS_MAX_REPLICATION, StorageTier } from "../constants";
import { WebDAVBackend } from "../storage-backends/WebDAVBackend";

export interface StorageBackendCreationData
{
    config: StorageBackendConfig;
    name: string;
    storageTier: StorageTier;
}

interface StorageBackendCacheData
{
    id: number;
    instance: StorageBackend;
    storageTier: StorageTier;
}

@Injectable
export class StorageBackendsManager
{
    constructor(private storageBackendsController: StorageBackendsController, private storageBlocksController: StorageBlocksController)
    {
        this.backends = {};
    }

    //Public methods
    public async Create(props: StorageBackendCreationData)
    {
        const backend = this.CreateBackendInstance(props.config);
        if(await backend.ConnectionTest())
        {
            const id = await this.storageBackendsController.Create({
                config: JSON.stringify(props.config),
                name: props.name,
                storageTier: props.storageTier
            });
            this.backends[id] = {
                instance: backend,
                id,
                storageTier: props.storageTier
            };
            return id;
        }
    }

    public async FindFastestBackendForReading(storageBlockId: number)
    {
        const backendId = await this.storageBlocksController.FindFastBackendIdThatHasBlock(storageBlockId);
        return this.backends[backendId!]!.instance;
    }

    public FindFastestBackendForWriting()
    {
        return ObjectExtensions.Values(this.backends).NotUndefined().OrderBy(x => x.storageTier).First();
    }

    public FindReplicationBackends(storageBackendIds: number[])
    {
        //TODO: should also pass storage tier as argument and try to find backends that match that
        return ObjectExtensions.Values(this.backends).NotUndefined().Filter(x => !storageBackendIds.includes(x.id)).OrderBy(x => x.storageTier).Take(CONST_STORAGEBLOCKS_MAX_REPLICATION);
    }

    public async Reload()
    {
        const backends = await this.storageBackendsController.QueryAll();
        for (const backend of backends)
        {
            this.backends[backend.id] = {
                id: backend.id,
                instance: this.CreateBackendInstance(JSON.parse(backend.config)),
                storageTier: backend.storageTier
            };
        }
    }

    //Private methods
    private CreateBackendInstance(config: StorageBackendConfig): StorageBackend
    {
        switch(config.type)
        {
            case "host-filesystem":
                return new HostFileSystemBackend(config.rootPath);
            case "smb":
                return new SMBBackend(config);
            case "webdav":
                return new WebDAVBackend(config);
        }
    }

    //State
    private backends: Dictionary<StorageBackendCacheData>;
}