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

import { Injectable } from "acts-util-node";
import { DBConnectionsManager } from "./DBConnectionsManager";
import { CONST_BLOCKSIZE, StorageTier } from "../constants";

interface StorageBackendProperties
{
    name: string;
    config: string;
    storageTier: StorageTier;
}

export interface StorageBackendRow extends StorageBackendProperties
{
    id: number;
}

@Injectable
export class StorageBackendsController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async Create(props: StorageBackendProperties)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("storagebackends", props);
        return result.insertId;
    }

    public async QueryAll()
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<StorageBackendRow>("SELECT * FROM storagebackends");
        return rows;
    }

    public async QueryUsedSize(storageBackendId: number)
    {
        const fullBlocksQuery = `
        SELECT COUNT(*) AS cnt
        FROM storagebackends_storageblocks sbsb
        LEFT JOIN storageblocks_residual sbr
            ON sbr.storageBlockId = sbsb.storageBlockId
        WHERE sbsb.storageBackendId = ? AND sbr.leftSize IS NULL;
        `;
        const residualQuery = `
        SELECT SUM(? - sbr.leftSize) AS sum
        FROM storagebackends_storageblocks sbsb
        INNER JOIN storageblocks_residual sbr
            ON sbr.storageBlockId = sbsb.storageBlockId
        WHERE sbsb.storageBackendId = ?;
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row1 = await conn.SelectOne(fullBlocksQuery, storageBackendId);
        const row2 = await conn.SelectOne(residualQuery, CONST_BLOCKSIZE, storageBackendId);

        const sumSize = (row2!.sum === null) ? 0 : parseInt(row2!.sum);

        return parseInt(row1!.cnt) * CONST_BLOCKSIZE + sumSize;
    }
}