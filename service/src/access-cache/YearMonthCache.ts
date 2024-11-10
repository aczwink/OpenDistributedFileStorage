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
import fs from "fs";
import path from "path";
import { Compress, Decompress } from "./Compression";
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { DateTime } from "acts-util-node";

class MonthCacheBlock
{
    constructor()
    {
        this.blobEntries = {};
    }

    //Public methods
    public Add(userId: string, blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        if(blobEntry === undefined)
        {
            this.blobEntries[blobId] = {
                [userId]: 1
            };
        }
        else
        {
            const currentCount = blobEntry[userId] ?? 0;
            blobEntry[userId] = currentCount + 1;
        }
    }

    public Contains(blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        return blobEntry !== undefined;
    }

    public* Entries(year: number)
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
                        const count = blobEntry[userId]!;
                        yield {
                            year,
                            blobId: parseInt(blobId),
                            userId,
                            count
                        };
                    }
                }
            }
        }
    }

    public FetchAccessCounts(blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        if(blobEntry === undefined)
            return 0;
        return ObjectExtensions.Values(blobEntry).NotUndefined().Sum();
    }

    public ToJSON()
    {
        return JSON.stringify(this.blobEntries);
    }

    //Class functions
    static FromJSON(json: string)
    {
        const block = new MonthCacheBlock;
        block.blobEntries = JSON.parse(json);

        return block;
    }

    //State
    private blobEntries: Dictionary<Dictionary<number>>;
}

export class YearMonthCache
{
    private constructor(private dirPath: string)
    {
        this.months = {};
        this.dirtyMonths = new Set();
    }

    //Public methods
    public Add(userId: string, blobId: number, timeStamp: number)
    {
        const id = this.MapId(timeStamp);

        let block = this.months[id];
        if(block === undefined)
            this.months[id] = block = new MonthCacheBlock;

        block.Add(userId, blobId);
        this.dirtyMonths.add(id);
    }

    public FetchAccessCounts(blobId: number)
    {
        return ObjectExtensions.Values(this.months).NotUndefined().Map(x => x.FetchAccessCounts(blobId)).Sum();
    }

    public FetchLastAccessTime(blobId: number)
    {
        return ObjectExtensions.Entries(this.months).Map(kv => kv.value!.Contains(blobId) ? this.BuildDateTime(kv.key.toString()).millisecondsSinceEpoch : 0).Max();
    }

    public FetchEntriesOf(id: string)
    {
        const dt = this.BuildDateTime(id);
        const year = dt.year;

        return this.months[id]!.Entries(year);
    }

    public async Persist()
    {
        const monthsToPersist = this.dirtyMonths.ToArray();
        this.dirtyMonths = new Set;

        for (const month of monthsToPersist)
        {
            const block = this.months[month]!;
            const compressed = await Compress(block.ToJSON());
            await fs.promises.writeFile(path.join(this.dirPath, month + ".json.gz"), compressed);
        }
    }

    public PrepareMigration(delta: DateTime)
    {
        return ObjectExtensions.Entries(this.months).Filter(kv => this.BuildDateTime(kv.key.toString()).IsBefore(delta)).Map(kv => kv.key.toString());
    }

    public async Remove(blockId: string)
    {
        const blockPath = path.join(this.dirPath, blockId + ".json.gz");
        await fs.promises.unlink(blockPath);
        delete this.months[blockId];
    }

    //Class functions
    static async Load(dirPath: string)
    {
        const cache = new YearMonthCache(dirPath);
        await cache.LoadPersisted();
        return cache;
    }

    //Private methods
    private BuildDateTime(key: string)
    {
        const parts = key.split("-");
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        return DateTime.ConstructUTC(year, month, 1, 0, 0, 0);
    }

    private async LoadPersisted()
    {
        const monthFileNames = await fs.promises.readdir(this.dirPath, "utf-8");
        for (const monthFileName of monthFileNames)
        {
            const blockPath = path.join(this.dirPath, monthFileName);
            const compressed = await fs.promises.readFile(blockPath);
            const decompressed = await Decompress(compressed);

            const yearMonth = monthFileName.substring(0, monthFileName.indexOf("."));

            const block = MonthCacheBlock.FromJSON(decompressed.toString("utf-8"));
            this.months[yearMonth] = block;
        }
    }

    private MapId(timeStamp: number)
    {
        const dt = DateTime.ConstructFromUnixTimeStampWithMilliSeconds(timeStamp);
        return dt.year + "-" + dt.month;
    }

    //State
    private months: Dictionary<MonthCacheBlock>;
    private dirtyMonths: Set<string>;
}