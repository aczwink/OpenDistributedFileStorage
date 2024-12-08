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

import { APIController, BadRequest, Body, Get, Post, Security } from "acts-util-apilib";
import { OIDC_API_SCHEME, SCOPE_ADMIN } from "../api_security";
import { StorageBackendConfig } from "../storage-backends/StorageBackendConfig";
import { StorageBackendRow, StorageBackendsController } from "../data-access/StorageBackendsController";
import { StorageBackendCreationData, StorageBackendsManager } from "../services/StorageBackendsManager";

interface StorageBackendDTO
{
    name: string;
    config: StorageBackendConfig;
    size: number;
}

@APIController("storage-backends")
@Security(OIDC_API_SCHEME, [SCOPE_ADMIN])
class _api_
{
    constructor(private storageBackendsController: StorageBackendsController, private storageBackendsManager: StorageBackendsManager)
    {
    }

    @Post()
    public async Create(
        @Body data: StorageBackendCreationData
    )
    {
        const id = await this.storageBackendsManager.Create(data);
        if(id === undefined)
            return BadRequest("Connection to backend failed");
        return id;
    }
    
    @Get()
    public async RequestAll()
    {
        const backends = await this.storageBackendsController.QueryAll();
        return backends.Values().Map(this.MapBackend.bind(this)).PromiseAll();
    }

    //Private methods
    private async MapBackend(backend: StorageBackendRow): Promise<StorageBackendDTO>
    {
        const size = await this.storageBackendsController.QueryUsedSize(backend.id);
        return {
            config: JSON.parse(backend.config),
            name: backend.name,
            size
        };
    }
}