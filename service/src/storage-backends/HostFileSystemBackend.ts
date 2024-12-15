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
import fs from "fs";
import path from "path";
import { StorageBackend } from "./StorageBackend";

export class HostFileSystemBackend implements StorageBackend
{
    constructor(private rootPath: string)
    {
    }

    //Public methods
    public async ConnectionTest(): Promise<boolean>
    {
        return fs.existsSync(this.rootPath);
    }

    public async CreateDirectoryIfNotExisting(dirPath: string): Promise<void>
    {
        const fullPath = path.join(this.rootPath, dirPath);
        if(!fs.existsSync(fullPath))
            await fs.promises.mkdir(fullPath);
    }

    public async ReadFile(filePath: string): Promise<Buffer>
    {
        const fullPath = path.join(this.rootPath, filePath);
        return await fs.promises.readFile(fullPath);
    }

    public async StoreFile(filePath: string, buffer: Buffer): Promise<void>
    {
        const fullPath = path.join(this.rootPath, filePath);
        await fs.promises.writeFile(fullPath, buffer, { flush: true });
    }
}