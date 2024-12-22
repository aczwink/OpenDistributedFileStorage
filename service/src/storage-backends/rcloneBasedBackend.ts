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
import path from "path";
import { GlobalInjector } from "acts-util-node";
import { StorageBackend } from "./StorageBackend";
import { CommandExecutor } from "../services/CommandExecutor";

export abstract class rcloneBasedBackend implements StorageBackend
{
    //Public methods
    public async ConnectionTest(): Promise<boolean>
    {
        return await this.TestIfFileExists("/");
    }
    
    public async CreateDirectoryIfNotExisting(dirPath: string): Promise<void>
    {
        const exists = await this.TestIfFileExists(dirPath);
        if(!exists)
            await this.Callrclone("mkdir", [], dirPath);
    }

    public async DeleteFile(filePath: string): Promise<void>
    {
        await this.Callrclone("deletefile", [], filePath);
    }

    public async ReadFile(filePath: string): Promise<Buffer>
    {
        const cmdExecutor = GlobalInjector.Resolve(CommandExecutor);

        const cmd = await this.BuildCommand("cat", [], filePath);
        const buffer = await cmdExecutor.ExecuteRaw(cmd);
        return buffer;
    }

    public async StoreFile(filePath: string, buffer: Buffer): Promise<void>
    {
        await this.Callrclone("rcat", ["--size", buffer.byteLength.toString()], filePath, buffer);
    }

    //Abstract
    protected abstract readonly protocolName: string;
    protected abstract readonly rootPath: string;
    protected abstract GetBackendArgs(): Promise<string[]>;

    //Protected methods
    protected async ObscurePassword(password: string)
    {
        const cmdExecutor = GlobalInjector.Resolve(CommandExecutor);
        const result = await cmdExecutor.Execute(["rclone", "obscure", "-"], password);
        const obscured = result.stdOut.trim();
        return obscured;
    }

    //Private methods
    private async BuildCommand(command: "deletefile" | "cat" | "ls" | "mkdir" | "rcat", args: string[], remotePath: string)
    {
        const fullPath = path.join(this.rootPath, remotePath);
        const cmd = [
            "rclone", command,
            ...(await this.GetBackendArgs()),
            ...args,
            ":" + this.protocolName + ":" + fullPath
        ];
        return cmd;
    }

    private async Callrclone(command: "deletefile" | "ls" | "mkdir" | "rcat", args: string[], remotePath: string, stdin?: Buffer)
    {
        const cmdExecutor = GlobalInjector.Resolve(CommandExecutor);

        const cmd = await this.BuildCommand(command, args, remotePath);
        const result = await cmdExecutor.Execute(cmd, stdin);

        return result.exitCode === 0;
    }

    private async TestIfFileExists(remotePath: string)
    {
        return await this.Callrclone("ls", ["--max-depth", "1",], remotePath);
    }
}