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
import { StorageTier } from "../constants";

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
        const query = `
        SELECT SUM(sb.size) AS sum
        FROM storageblocks sb
        INNER JOIN storagebackends_storageblocks sbsb
            ON sbsb.storageBlockId = sb.id
        WHERE sbsb.storageBackendId = ?;
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne(query, storageBackendId);

        const sumSize = (row!.sum === null) ? 0 : parseInt(row!.sum);
        return sumSize;
    }
}