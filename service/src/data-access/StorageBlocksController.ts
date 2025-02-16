/**
 * OpenDistributedFileStorage
 * Copyright (C) 2024-2025 Amir Czwink (amir130@hotmail.de)
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

export interface ResidualBlock
{
    storageBlockId: number;
    size: number;
}

@Injectable
export class StorageBlocksController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async AddBlockLocation(storageBlockId: number, storageBackendId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.InsertRow("storagebackends_storageblocks", {
            storageBackendId,
            storageBlockId
        });
    }

    public async CreateBlock()
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("storageblocks", { size: 0, iv: "", authTag: "" });
        const storageBlockId = result.insertId;

        return storageBlockId;
    }

    public async FindFastBackendIdThatHasBlock(storageBlockId: number)
    {
        const query = `
        SELECT sbsb.storageBackendId
        FROM storagebackends_storageblocks sbsb
        INNER JOIN storagebackends sb
            ON sb.id = sbsb.storageBackendId
        WHERE sbsb.storageBlockId = ?
        ORDER BY sb.storageTier ASC
        LIMIT 1;
        `;

        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query, storageBlockId);
        return row?.storageBackendId as number | undefined;
    }

    public async FreeBlock(storageBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.DeleteRows("storageblocks_residual", "storageBlockId = ?", storageBlockId);
        await conn.InsertRow("storageblocks_freed", { storageBlockId });
        await conn.UpdateRows("storageblocks", { size: 0, iv: "", authTag: "" }, "id = ?", storageBlockId);
    }

    public async IsBlockOnFreeList(storageBlockId: number)
    {
        const query = `
        SELECT TRUE
        FROM storageblocks_freed
        WHERE storageBlockId = ?
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query, storageBlockId);
        if(row === undefined)
            return false;
        return true;
    }

    public async PutOnResidualList(storageBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.InsertRow("storageblocks_residual", { storageBlockId });
    }

    public async QueryBlockLocations(storageBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select("SELECT storageBackendId FROM storagebackends_storageblocks WHERE storageBlockId = ?", storageBlockId);
        return rows.map(x => x.storageBackendId as number);
    }

    public async QueryEncryptionInfo(storageBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT iv, authTag FROM storageblocks WHERE id = ?", storageBlockId);

        if(row === undefined)
            return undefined;
        return {
            authTag: Buffer.from(row.authTag, "hex"),
            iv: Buffer.from(row.iv, "hex"),
        };
    }

    public async QueryResidualBlockCount()
    {
        const query = `
        SELECT COUNT(*) AS cnt
        FROM storageblocks_residual
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query);

        if(row === undefined)
            return 0;
        return row.cnt as number;
    }

    public async QueryResidualBlocksOrderedBySizeDescending()
    {
        const query = `
        SELECT sbr.storageBlockId, sb.size
        FROM storageblocks_residual sbr
        INNER JOIN storageblocks sb
            ON sb.id = sbr.storageBlockId
        ORDER BY sb.size DESC
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<ResidualBlock>(query);
        return rows;
    }

    public async RemoveBlockLocation(storageBlockId: number, storageBackendId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.DeleteRows("storagebackends_storageblocks", "storageBackendId = ? AND storageBlockId = ?", storageBackendId, storageBlockId);
    }

    public async TryRemoveStorageBlockFromFreeList()
    {
        const query = `
        SELECT storageBlockId
        FROM storageblocks_freed
        LIMIT 1
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query);
        if(row === undefined)
            return null;
        const storageBlockId = row.storageBlockId as number;

        await conn.DeleteRows("storageblocks_freed", "storageBlockId = ?", storageBlockId);

        return storageBlockId;
    }

    public async UpdateStorageBlockInfo(storageBlockId: number, size: number, iv: Buffer, authTag: Buffer)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.UpdateRows("storageblocks", {
            size,
            iv: iv.toString("hex"),
            authTag: authTag.toString("hex")
        }, "id = ?", storageBlockId);
    }
}