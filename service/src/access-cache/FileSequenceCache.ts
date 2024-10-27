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
import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { CONST_FILESEQUENCECACHE_NUMBER_OF_ENTRIES_PER_BLOCK } from "../constants";

class FileSequenceCacheBlock
{
    constructor()
    {
        this.fileEntries = {};
        this.entriesCount = 0;
    }

    //Properties
    public get isFull()
    {
        return this.entriesCount >= CONST_FILESEQUENCECACHE_NUMBER_OF_ENTRIES_PER_BLOCK;
    }

    //Public methods
    public AddEntry(userId: string, fileId: number)
    {
        const accessTime = Date.now();

        const entriesPerFile = this.fileEntries[fileId];
        if(entriesPerFile === undefined)
        {
            this.fileEntries[fileId] = {
                [userId]: [accessTime]
            };
        }
        else
        {
            const entriesPerFileAndUser = entriesPerFile[userId];
            if(entriesPerFileAndUser === undefined)
                entriesPerFile[userId] = [accessTime];
            else
                entriesPerFileAndUser.push(accessTime);
        }
    }

    public ToJSON()
    {
        return JSON.stringify(this.fileEntries);
    }

    //Class functions
    static FromJSON(json: string)
    {
        const block = new FileSequenceCacheBlock;
        block.fileEntries = JSON.parse(json);
        block.entriesCount = ObjectExtensions.Values(block.fileEntries).NotUndefined()
            .Map(x => ObjectExtensions.Values(x)).Flatten().NotUndefined()
            .Map(x => x.length)
            .Sum();

        return block;
    }

    //State
    private fileEntries: Dictionary<Dictionary<number[]>>;
    private entriesCount: number;
}

export class FileSequenceCache
{
    constructor(private dirPath: string)
    {
        this.sequence = {};
        this.latestId = "";
        this.dirtyIds = new Set;
        
        this.AddBlock();
        this.Load();
    }

    //Public methods
    public AddEntry(userId: string, fileId: number)
    {
        if(this.latest.isFull)
            this.AddBlock();

        this.latest.AddEntry(userId, fileId);
        this.ScheduleWrite(this.latestId);
    }

    //Private properties
    private get latest()
    {
        return this.sequence[this.latestId]!;
    }

    //Private methods
    private AddBlock()
    {
        const newId = crypto.randomUUID();
        this.sequence[newId] = new FileSequenceCacheBlock;
        this.latestId = newId;
    }

    private Compress(data: string)
    {
        return new Promise<Buffer>( (resolve, reject) => {
            zlib.gzip(data, {
                level: zlib.constants.Z_BEST_COMPRESSION,
            }, (error, result) => {
                if(error !== null)
                    reject(error);
                else
                    resolve(result);
            });
        });
    }

    private Decompress(data: Buffer)
    {
        return new Promise<Buffer>( (resolve, reject) => {
            zlib.gunzip(data, (error, result) => {
                if(error !== null)
                    reject(error);
                else
                    resolve(result);
            });
        });
    }

    private async Load()
    {
        const blockFileNames = await fs.promises.readdir(this.dirPath, "utf-8");
        for (const blockFileName of blockFileNames)
        {
            const blockPath = path.join(this.dirPath, blockFileName);
            const compressed = await fs.promises.readFile(blockPath);
            const decompressed = await this.Decompress(compressed);

            const id = blockFileName.substring(0, blockFileName.indexOf("."));

            const block = FileSequenceCacheBlock.FromJSON(decompressed.toString("utf-8"));
            this.sequence[id] = block;

            if(!block.isFull)
                this.latestId = id;
        }
    }
    
    private async Persist()
    {
        this.persistTimer = undefined;
        const idsToPersist = this.dirtyIds.ToArray();
        this.dirtyIds = new Set;

        for (const id of idsToPersist)
        {
            const block = this.sequence[id]!;
            const compressed = await this.Compress(block.ToJSON());
            await fs.promises.writeFile(path.join(this.dirPath, id + ".json.gz"), compressed);
        }
    }

    private ScheduleWrite(id: string)
    {
        this.dirtyIds.add(id);

        const delay = 1000 * 60 * 3; //don't spam the file system with huge amounts of disk IO
        if(this.persistTimer === undefined)
            this.persistTimer = setTimeout(this.Persist.bind(this), delay);
    }

    //State
    private sequence: Dictionary<FileSequenceCacheBlock>;
    private latestId: string;
    private dirtyIds: Set<string>;
    private persistTimer?: NodeJS.Timeout;
}