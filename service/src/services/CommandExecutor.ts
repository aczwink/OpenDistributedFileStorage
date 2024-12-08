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
import child_process from "child_process";
import { Injectable } from "acts-util-node";

interface CommandExecutionResult
{
    exitCode: number;
    stdOut: string;
    stdErr: string;
}

@Injectable
export class CommandExecutor
{
    //Public methods
    public Execute(command: string[], stdin?: Buffer | string)
    {
        const cmdLine = command.join(" ");
        const child = child_process.spawn(cmdLine, {
            shell: true
        });
        if(stdin !== undefined)
        {
            child.stdin.write(stdin);
            child.stdin.end();
        }

        let stdErr = "";
        let stdOut = "";
        child.stdout.setEncoding("utf-8");
        child.stderr.setEncoding("utf-8");
        child.stdout.on("data", data => stdOut += data);
        child.stderr.on("data", data => stdErr += data);

        return new Promise<CommandExecutionResult>( (resolve, reject) => {
            child.on("exit", code => {
                if(code === null)
                    reject();
                else
                {
                    resolve({
                        exitCode: code,
                        stdErr,
                        stdOut
                    });
                }
            });
        });
    }

    public ExecuteRaw(command: string[])
    {
        const cmdLine = command.join(" ");
        const child = child_process.spawn(cmdLine, {
            shell: true
        });

        const buffers: Buffer[] = [];
        child.stdout.on("data", chunk => buffers.push(chunk));

        return new Promise<Buffer>( (resolve, reject) => {
            child.on("exit", code => {
                if(code !== 0)
                    reject();
                else
                    resolve(Buffer.concat(buffers));
            });
        });
    }
}