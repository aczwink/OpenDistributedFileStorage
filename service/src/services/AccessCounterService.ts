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
import { DateTime, Injectable } from "acts-util-node";
import { FileSequenceCache } from "../access-cache/FileSequenceCache";
import { YearMonthCache } from "../access-cache/YearMonthCache";
import { YearCache } from "../access-cache/YearCache";
import { FileVersionsController } from "../data-access/FileVersionsController";
import { FilesController } from "../data-access/FilesController";
import { StorageTier } from "../constants";
import { CONFIG_ROOTDIR } from "../env";

const accessCounterRootDir = CONFIG_ROOTDIR + "/accessCounters";
const latestDir = accessCounterRootDir + "/latest";
const currentYearDir = accessCounterRootDir + "/currentYear";
const pastYearsDir = accessCounterRootDir + "/pastYears";

interface AccessCounts
{
    nearPast: number;
    past: number;
    recent: number;
}

interface AccessStatistics extends AccessCounts
{
    lastAccessTime: number;
    storageTier: StorageTier;
}

@Injectable
export class AccessCounterService
{
    constructor(private fileVersionsController: FileVersionsController, private filesController: FilesController)
    {
        this.max = {
            nearPast: 1,
            past: 1,
            recent: 1
        };

        this.LoadCache();
    }

    //Public methods
    public AddBlobAccess(userId: string, blobId: number)
    {
        //we explicitly discard all accesses until the cache is loaded
        this.latest?.AddEntry(userId, blobId);
    }

    public FetchBlobAccessCounts(blobId: number): AccessStatistics
    {
        const counts: AccessCounts = {
            nearPast: this.currentYear?.FetchAccessCounts(blobId) ?? 0,
            past: this.pastYears?.FetchAccessCounts(blobId) ?? 0,
            recent: this.latest?.FetchAccessCounts(blobId) ?? 0,
        };

        return {
            ...counts,
            lastAccessTime: this.FetchLastAccessTime(blobId),
            storageTier: this.ComputeStorageTier(counts)
        };
    }

    public async FetchFileAccessCounts(fileId: number)
    {
        const revisions = await this.filesController.QueryRevisions(fileId);

        const versions = await this.fileVersionsController.QueryVersions(fileId);
        const filtered = versions.filter(x => (x.title !== "preview") && !x.title.startsWith("thumb_"));

        const c1 = revisions.map(x => this.FetchBlobAccessCounts(x.blobId));
        const c2 = filtered.map(x => this.FetchBlobAccessCounts(x.blobId));

        return this.Average(c1.concat(c2));
    }

    public FetchLastAccessTime(blobId: number)
    {
        const lastAccessTime = (this.latest?.FetchLastAccessTime(blobId)
            || this.currentYear?.FetchLastAccessTime(blobId)
            || this.pastYears?.FetchLastAccessTime(blobId)
        ) ?? 0;
        return lastAccessTime;
    }

    //Private methods
    private Average(stats: AccessStatistics[]): AccessStatistics
    {
        if(stats.length === 0)
        {
            return {
                lastAccessTime: 0,
                storageTier: StorageTier.Archive,
                nearPast: 0,
                past: 0,
                recent: 0
            };
        }
        return {
            lastAccessTime: stats.Values().Map(x => x.lastAccessTime).Max(),
            storageTier: stats.Values().Map(x => x.storageTier).Min(),
            nearPast: stats.Values().Map(x => x.nearPast).Sum() / stats.length,
            past: stats.Values().Map(x => x.past).Sum() / stats.length,
            recent: stats.Values().Map(x => x.recent).Sum() / stats.length,
        };
    }

    private ComputeStorageTier(counts: AccessCounts): StorageTier
    {
        this.max.nearPast = Math.max(this.max.nearPast, counts.nearPast);
        this.max.past = Math.max(this.max.past, counts.past);
        this.max.recent = Math.max(this.max.recent, counts.recent);

        const v1 = counts.nearPast / this.max.nearPast;
        const v2 = counts.past / this.max.past;
        const v3 = counts.recent / this.max.recent;

        const w1 = 0.45;
        const w2 = 0.35;
        const w3 = 0.2;
        const value = w1 * v1 + w2 * v2 + w3 * v3;

        if(value >= 0.75)
            return StorageTier.Hot;
        if(value >= 0.4)
            return StorageTier.Cool;
        return StorageTier.Archive;
    }

    private async LoadCache()
    {
        this.latest = await FileSequenceCache.Load(latestDir);
        this.currentYear = await YearMonthCache.Load(currentYearDir);
        this.pastYears = await YearCache.Load(pastYearsDir);

        this.Migrate();
    }

    private async Migrate()
    {
        const now = DateTime.Now().ToUTC();
        const delta = now.Subtract({ count: 1, unit: "months" }).EndOfMonth();
        const preparedLatestBlocks = this.latest!.PrepareMigration(delta).ToArray();

        for (const block of preparedLatestBlocks)
        {
            for (const blockEntry of block.value!.Entries())
            {
                for (const timeStamp of blockEntry.timeStamps)
                {
                    const dt = DateTime.ConstructFromUnixTimeStampWithMilliSeconds(timeStamp);
                    if(dt.year !== DateTime.Now().ToUTC().year)
                        this.pastYears!.Add(blockEntry.blobId, dt.year, 1);
                    else
                        this.currentYear!.Add(blockEntry.userId, blockEntry.blobId, timeStamp);
                }
            }
        }

        const endOfLastYear = DateTime.ConstructUTC(now.year - 1, 12, 31, 23, 59, 59);
        const preparedMonthBlocks = this.currentYear!.PrepareMigration(endOfLastYear).ToArray();

        for (const blockId of preparedMonthBlocks)
        {
            for (const blockEntry of this.currentYear!.FetchEntriesOf(blockId))
            {
                this.pastYears!.Add(blockEntry.blobId, blockEntry.year, blockEntry.count);
            }
        }

        await this.currentYear!.Persist();
        await this.pastYears!.Persist();
        for (const blockId of preparedMonthBlocks)
            await this.currentYear!.Remove(blockId);
        for (const block of preparedLatestBlocks)
            await this.latest!.Remove(block.key.toString());
    }

    //State
    private latest?: FileSequenceCache;
    private currentYear?: YearMonthCache;
    private pastYears?: YearCache;
    private max: AccessCounts;
}