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
import { rcloneBasedBackend } from "./rcloneBasedBackend";
import { SMBBackendConfig } from "./StorageBackendConfig";

export class SMBBackend extends rcloneBasedBackend
{
    constructor(private config: SMBBackendConfig)
    {
        super();
    }

    //Protected properties
    protected get protocolName(): string
    {
        return "smb";
    }

    protected get rootPath(): string
    {
        return this.config.rootPath;
    }

    //Protected methods
    protected async GetBackendArgs(): Promise<string[]>
    {
        return [
            "--smb-host", this.config.hostName,
            "--smb-user", this.config.userName,
            "--smb-pass", await this.ObscurePassword(this.config.password),
        ];
    }
}