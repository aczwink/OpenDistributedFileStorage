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
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { CONST_FILESEQUENCECACHE_NUMBER_OF_ENTRIES_PER_BLOCK } from "../constants";
import { Compress, Decompress } from "./Compression";
import { DateTime } from "acts-util-node";

class FileSequenceCacheBlock
{
    constructor()
    {
        this.blobEntries = {};
        this.entriesCount = 0;
        this._newest = 0;
    }

    //Properties
    public get isFull()
    {
        return this.entriesCount >= CONST_FILESEQUENCECACHE_NUMBER_OF_ENTRIES_PER_BLOCK;
    }

    public get newest()
    {
        return this._newest;
    }

    //Public methods
    public AddEntry(userId: string, blobId: number)
    {
        const accessTime = DateTime.Now().millisecondsSinceEpoch;
        this._newest = Math.max(this._newest, accessTime);

        const entriesPerBlob = this.blobEntries[blobId];
        if(entriesPerBlob === undefined)
        {
            this.blobEntries[blobId] = {
                [userId]: [accessTime]
            };
        }
        else
        {
            const entriesPerBlobAndUser = entriesPerBlob[userId];
            if(entriesPerBlobAndUser === undefined)
                entriesPerBlob[userId] = [accessTime];
            else
                entriesPerBlobAndUser.push(accessTime);
        }
    }

    public* Entries()
    {
        for (const blobId in this.blobEntries)
        {
            if (Object.prototype.hasOwnProperty.call(this.blobEntries, blobId))
            {
                const blobEntry = this.blobEntries[blobId]!;
                for (const userId in blobEntry)
                {
                    if (Object.prototype.hasOwnProperty.call(blobEntry, userId))
                    {
                        const timeStamps = blobEntry[userId]!;
                        yield {
                            blobId: parseInt(blobId),
                            userId,
                            timeStamps
                        };
                    }
                }
            }
        }
    }

    public FetchLastAccessTime(blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        if(blobEntry === undefined)
            return 0;
        return ObjectExtensions.Values(blobEntry).NotUndefined().Map(x => x.Values()).Flatten().Max();
    }

    public FetchAccessCounts(blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        if(blobEntry === undefined)
            return 0;
        return ObjectExtensions.Values(blobEntry).NotUndefined().Map(x => x.length).Sum();
    }

    public ToJSON()
    {
        return JSON.stringify(this.blobEntries);
    }

    //Class functions
    static FromJSON(json: string)
    {
        const block = new FileSequenceCacheBlock;
        block.blobEntries = JSON.parse(json);
        block.entriesCount = ObjectExtensions.Values(block.blobEntries).NotUndefined()
            .Map(x => ObjectExtensions.Values(x)).Flatten().NotUndefined()
            .Map(x => x.length)
            .Sum();
        block._newest = ObjectExtensions.Values(block.blobEntries).NotUndefined()
            .Map(x => ObjectExtensions.Values(x)).Flatten().NotUndefined()
            .Map(x => x.Values()).Flatten()
            .Max();

        return block;
    }

    //State
    private blobEntries: Dictionary<Dictionary<number[]>>;
    private entriesCount: number;
    private _newest: number;
}

export class FileSequenceCache
{
    private constructor(private dirPath: string)
    {
        this.sequence = {};
        this.latestId = "";
        this.dirtyIds = new Set;
    }

    //Class functions
    public static async Load(dirPath: string)
    {
        const cache = new FileSequenceCache(dirPath);
        await cache.LoadPersisted();
        return cache;
    }

    //Public methods
    public AddEntry(userId: string, blobId: number)
    {
        if(this.latest.isFull)
            this.AddBlock();

        this.latest.AddEntry(userId, blobId);
        this.ScheduleWrite(this.latestId);
    }

    public FetchAccessCounts(blobId: number)
    {
        return ObjectExtensions.Values(this.sequence).NotUndefined().Map(x => x.FetchAccessCounts(blobId)).Sum();
    }

    public FetchLastAccessTime(blobId: number)
    {
        return ObjectExtensions.Values(this.sequence).NotUndefined().Map(x => x.FetchLastAccessTime(blobId)).Max();
    }

    public PrepareMigration(delta: DateTime)
    {
        return ObjectExtensions.Entries(this.sequence).Filter(kv => (kv.value!.isFull) && (this.latestId !== kv.key) && (kv.value!.newest < delta.millisecondsSinceEpoch));
    }

    public async Remove(blockId: string)
    {
        const blockPath = path.join(this.dirPath, blockId + ".json.gz");
        await fs.promises.unlink(blockPath);
        delete this.sequence[blockId];
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

    private async LoadPersisted()
    {
        const blockFileNames = await fs.promises.readdir(this.dirPath, "utf-8");
        for (const blockFileName of blockFileNames)
        {
            const blockPath = path.join(this.dirPath, blockFileName);
            const compressed = await fs.promises.readFile(blockPath);
            const decompressed = await Decompress(compressed);

            const id = blockFileName.substring(0, blockFileName.indexOf("."));

            const block = FileSequenceCacheBlock.FromJSON(decompressed.toString("utf-8"));
            this.sequence[id] = block;

            if(!block.isFull)
                this.latestId = id;
        }

        if(this.latestId === "")
            this.AddBlock();
    }
    
    private async Persist()
    {
        this.persistTimer = undefined;
        const idsToPersist = this.dirtyIds.ToArray();
        this.dirtyIds = new Set;

        for (const id of idsToPersist)
        {
            const block = this.sequence[id]!;
            const compressed = await Compress(block.ToJSON());
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