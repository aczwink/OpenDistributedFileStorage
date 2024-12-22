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
export class ReportingController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async FindLargeBlobs()
    {
        const query = `
        SELECT bb.blobId, MAX(bb.offset + bbs.size) AS size
        FROM blobs_blocks bb
        INNER JOIN blobblocks bbs
            ON bbs.id = bb.blobBlockId
        GROUP BY bb.blobId
        ORDER BY size DESC
        LIMIT 50
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<{ blobId: number; size: string; }>(query);
        return rows.Values().Map(x => ({
            blobId: x.blobId,
            size: parseInt(x.size)
        }));
    }

    public async FindSomeFileAssociation(blobId: number)
    {
        const query = `
        SELECT f.filePath
        FROM files_revisions fr
        INNER JOIN files f
            ON f.id = fr.fileId
        WHERE fr.blobId = ?
        LIMIT 1
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne<{ filePath: string }>(query, blobId);
        if(row === undefined)
            return "UNKNOWN BLOB ID: " + blobId;
        return row.filePath;
    }
}