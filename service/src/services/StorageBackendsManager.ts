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
import { Injectable } from "acts-util-node";
import { StorageBackend } from "../storage-backends/StorageBackend";
import { StorageBackendsController } from "../data-access/StorageBackendsController";
import { StorageBackendConfig } from "../storage-backends/StorageBackendConfig";
import { HostFileSystemBackend } from "../storage-backends/HostFileSystemBackend";

@Injectable
export class StorageBackendsManager
{
    constructor(private storageBackendsController: StorageBackendsController)
    {
        this.backends = [];
    }

    //Public methods
    public FindFastestBackendForReading()
    {
        return this.backends[0];
    }

    public FindFastestBackendForWriting()
    {
        return this.backends[0];
    }

    public async Reload()
    {
        const backends = await this.storageBackendsController.QueryAll();
        for (const backend of backends)
        {
            const config = JSON.parse(backend.config) as StorageBackendConfig;
            switch(config.type)
            {
                case "host-filesystem":
                    return new HostFileSystemBackend(config.rootPath);
                case "smb":
                case "webdav":
                    throw new Error("TODO: implement me " + config.type);
            }
        }
    }

    //State
    private backends: StorageBackend[];
}