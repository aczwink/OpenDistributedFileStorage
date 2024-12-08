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
import { Dictionary, ObjectExtensions } from "acts-util-core";
import { Compress, Decompress } from "./Compression";
import { DateTime } from "acts-util-node";

class YearCacheBlock
{
    constructor()
    {
        this.blobEntries = {};
    }

    //Public methods
    public Add(blobId: number, count: number)
    {
        const currentCount = this.blobEntries[blobId] ?? 0;
        this.blobEntries[blobId] = currentCount + count;
    }

    public Contains(blobId: number)
    {
        const blobEntry = this.blobEntries[blobId];
        return blobEntry !== undefined;
    }

    public FetchAccessCounts(blobId: number)
    {
        return this.blobEntries[blobId] ?? 0;
    }

    public ToJSON()
    {
        return JSON.stringify(this.blobEntries);
    }

    //Class functions
    static FromJSON(json: string)
    {
        const block = new YearCacheBlock;
        block.blobEntries = JSON.parse(json);

        return block;
    }

    //State
    private blobEntries: Dictionary<number>;
}

export class YearCache
{
    constructor(private dirPath: string)
    {
        this.years = {};
        this.dirtyYears = new Set();
    }

    //Public methods
    public Add(blobId: number, year: number, count: number)
    {
        let block = this.years[year];
        if(block === undefined)
            this.years[year] = block = new YearCacheBlock;

        block.Add(blobId, count);
        this.dirtyYears.add(year);
    }

    public FetchAccessCounts(blobId: number)
    {
        return ObjectExtensions.Values(this.years).NotUndefined().Map(x => x.FetchAccessCounts(blobId)).Sum();
    }

    public FetchLastAccessTime(blobId: number)
    {
        return ObjectExtensions.Entries(this.years).Map(kv => kv.value!.Contains(blobId) ? this.BuildDateTime(parseInt(kv.key.toString())).millisecondsSinceEpoch : 0).Max();
    }

    public async Persist()
    {
        const yearsToPersist = this.dirtyYears.ToArray();
        this.dirtyYears = new Set;

        for (const year of yearsToPersist)
        {
            const block = this.years[year]!;
            const compressed = await Compress(block.ToJSON());
            await fs.promises.writeFile(path.join(this.dirPath, year + ".json.gz"), compressed);
        }
    }

    //Class functions
    static async Load(dirPath: string)
    {
        const cache = new YearCache(dirPath);
        await cache.LoadPersisted();
        return cache;
    }

    //Private methods
    private BuildDateTime(year: number)
    {
        return DateTime.ConstructUTC(year, 1, 1, 0, 0, 0);
    }

    private async LoadPersisted()
    {
        const yearFileNames = await fs.promises.readdir(this.dirPath, "utf-8");
        for (const yearFileName of yearFileNames)
        {
            const blockPath = path.join(this.dirPath, yearFileName);
            const compressed = await fs.promises.readFile(blockPath);
            const decompressed = await Decompress(compressed);

            const yearStr = yearFileName.substring(0, yearFileName.indexOf("."));
            const year = parseInt(yearStr);

            const block = YearCacheBlock.FromJSON(decompressed.toString("utf-8"));
            this.years[year] = block;
        }
    }

    //State
    private years: Dictionary<YearCacheBlock>;
    private dirtyYears: Set<number>;
}