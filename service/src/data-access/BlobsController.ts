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

import { Injectable } from "acts-util-node";
import { DBConnectionsManager } from "./DBConnectionsManager";

interface BlockBlob
{
    size: number;
    sha256sum: string;
}

export interface BlobStorageInfoEntry
{
    offset: number;
    size: number;
    storageBlockId: number;
    storageBlockOffset: number;
}

@Injectable
export class BlobsController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async AddBlob(sha256sum: string, blockIds: number[])
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("blobs", {
            sha256sum
        });
        const blobId = result.insertId;

        let offset = 0;
        for (const blockId of blockIds)
        {
            await conn.InsertRow("blobs_blocks", {
                blobId,
                offset,
                blobBlockId: blockId
            });

            const blobBlock = await this.QueryBlockBlob(blockId);
            offset += blobBlock!.size;
        }

        return blobId;
    }

    public async AddBlobBlock(size: number, sha256sum: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("blobblocks", {
            size,
            sha256sum
        });

        return result.insertId;
    }

    public async AddBlobBlockStorage(blobBlockId: number, storageBlockId: number, storageBlockOffset: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.InsertRow("blobblocks_storageblocks", {
            blobBlockId,
            storageBlockId,
            storageBlockOffset
        });
    }

    public async DeleteBlob(blobId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.DeleteRows("blobs_blocks", "blobId = ?", blobId);
        await conn.DeleteRows("blobs", "id = ?", blobId);
    }

    public async FindBlobByHash(sha256sum: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT id FROM blobs WHERE sha256sum = ?", sha256sum);
        return row?.id as number | undefined;
    }

    public async FindBlobBlock(size: number, sha256sum: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT id FROM blobblocks WHERE size = ? AND sha256sum = ?", size, sha256sum);
        return row?.id as number | undefined;
    }

    public async QueryBlockBlob(id: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne<BlockBlob>("SELECT size, sha256sum FROM blobblocks WHERE id = ?", id);
        return row;
    }

    public async QueryBlobStoredSize(blobId: number)
    {
        const query = `
        SELECT SUM(t.size) AS total
        FROM (
            SELECT size
            FROM blobs_blocks bsb
            INNER JOIN blobblocks bbs
            ON bsb.blobBlockId = bbs.id
            WHERE bsb.blobId = ?
            GROUP BY bsb.blobBlockId
        ) t
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query, blobId);
        if(row === undefined)
            return undefined;
        return parseInt(row.total);
    }

    public async QueryBlobSize(blobId: number)
    {
        const query = `
        SELECT (bb.offset + bbs.size) AS size
        FROM blobs_blocks bb
        INNER JOIN blobblocks bbs
            ON bbs.id = bb.blobBlockId
        WHERE bb.blobId = ?
        ORDER BY bb.offset DESC
        LIMIT 1
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query, blobId);
        if(row === undefined)
            return undefined;
        return parseInt(row.size);
    }

    public async QueryBlobStorageInfo(blobId: number)
    {
        const query = `
        SELECT bb.offset, bbs.size, bbsb.storageBlockId, bbsb.storageBlockOffset
        FROM blobs_blocks bb
        INNER JOIN blobblocks bbs
            ON bbs.id = bb.blobBlockId
        INNER JOIN blobblocks_storageblocks bbsb
            ON bbsb.blobBlockId = bbs.id
        WHERE bb.blobId = ?
        ORDER BY bb.offset
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<BlobStorageInfoEntry>(query, blobId);
        return rows;
    }

    public async QueryMetaData(blobId: number, key: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT metadata FROM blobs_metadata WHERE blobId = ? AND metadataKey = ?", blobId, key);
        return row?.metadata as string | undefined;
    }

    public async WriteMetaData(blobId: number, key: string, data: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.UpdateRows("blobs_metadata", { metadata: data }, "blobId = ? AND metadataKey = ?", blobId, key);
        if(result.changedRows === 0)
        {
            await conn.InsertRow("blobs_metadata", {
                blobId: blobId,
                metadataKey: key,
                metadata: data,
            });
        }
    }
}