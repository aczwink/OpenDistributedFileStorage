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

import { LockedProperty } from "acts-util-node";
import { StorageBackend } from "./StorageBackend";

export class LockedStorageBackend implements StorageBackend
{
    constructor(storageBackend: StorageBackend)
    {
        this.storageBackend = new LockedProperty(storageBackend);
    }

    //Public methods
    public async ConnectionTest(): Promise<boolean>
    {
        const locked = await this.storageBackend.Lock();
        try
        {
            return await locked.value.ConnectionTest();
        }
        finally
        {
            locked.Release();
        }
    }

    public async CreateDirectoryIfNotExisting(dirPath: string): Promise<void>
    {
        const locked = await this.storageBackend.Lock();
        try
        {
            return await locked.value.CreateDirectoryIfNotExisting(dirPath);
        }
        finally
        {
            locked.Release();
        }
    }

    public async ReadFile(filePath: string): Promise<Buffer>
    {
        const locked = await this.storageBackend.Lock();
        try
        {
            return await locked.value.ReadFile(filePath);
        }
        finally
        {
            locked.Release();
        }
    }

    public async StoreFile(filePath: string, buffer: Buffer): Promise<void>
    {
        const locked = await this.storageBackend.Lock();
        try
        {
            return await locked.value.StoreFile(filePath, buffer);
        }
        finally
        {
            locked.Release();
        }
    }

    //State
    private storageBackend: LockedProperty<StorageBackend>;
}