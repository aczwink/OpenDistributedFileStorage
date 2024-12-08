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
        const result = await conn.InsertRow("storageblocks", { iv: "", authTag: "" });
        const storageBlockId = result.insertId;

        return storageBlockId;
    }

    public async CreateResidualBlock(leftSize: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("storageblocks", { iv: "", authTag: "" });
        const storageBlockId = result.insertId;

        await conn.InsertRow("storageblocks_residual", {
            storageBlockId,
            leftSize
        });

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

    public async FindResidualBlock(size: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne<{ storageBlockId: number; leftSize: number; }>("SELECT storageBlockId, leftSize FROM storageblocks_residual WHERE leftSize >= ? LIMIT 1", size);
        return row;
    }

    public async IsResidualBlock(storageBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT TRUE FROM storageblocks_residual WHERE storageBlockId = ?", storageBlockId);
        return row !== undefined;
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

    public async ReduceLeftSizeOfResidualBlock(storageBlockId: number, newLeftSize: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();

        if(newLeftSize === 0)
            await conn.DeleteRows("storageblocks_residual", "storageBlockId = ?", storageBlockId);
        else
            await conn.UpdateRows("storageblocks_residual", { leftSize: newLeftSize }, "storageBlockId = ?", storageBlockId);
    }

    public async UpdateBlockLocation(storageBlockId: number, storageBackendId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.DeleteRows("storagebackends_storageblocks", "storageBlockId = ?", storageBlockId);
        await conn.InsertRow("storagebackends_storageblocks", {
            storageBackendId,
            storageBlockId
        });
    }

    public async UpdateEncryptionInfo(storageBlockId: number, iv: Buffer, authTag: Buffer)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.UpdateRows("storageblocks", { iv: iv.toString("hex"), authTag: authTag.toString("hex") }, "id = ?", storageBlockId);
    }
}