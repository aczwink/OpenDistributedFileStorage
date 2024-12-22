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
export class GarbageCollectionController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async DeleteBlobBlock(blobBlockId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.DeleteRows("blobblocks_storageblocks", "blobBlockId = ?", blobBlockId);
        await conn.DeleteRows("blobblocks", "id = ?", blobBlockId);
    }

    public async FindSoftDeletedFilesThatShouldBeHardDeleted()
    {
        const query = `
        SELECT fd.fileId
        FROM files_deleted fd
        WHERE TIMESTAMPDIFF(DAY,fd.deletionTime, NOW()) > 30
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<{ fileId: number }>(query);
        return rows.Values().Map(x => x.fileId);
    }

    public async FindUnreferencedBlobs()
    {
        const query = `
        SELECT b.id
        FROM blobs b
        LEFT JOIN files_revisions fr
            ON fr.blobId = b.id
        LEFT JOIN blobs_versions bv
            ON bv.versionBlobId = b.id
        WHERE (fr.fileId IS NULL) AND (bv.blobId IS NULL);
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<{ id: number }>(query);
        return rows.Values().Map(x => x.id);
    }

    public async FindUnreferencedBlobBlocks()
    {
        const query = `
        SELECT bbs.id
        FROM blobblocks bbs
        LEFT JOIN blobs_blocks bsb
            ON bsb.blobBlockId = bbs.id
        WHERE bsb.blobId IS NULL
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<{ id: number }>(query);
        return rows.Values().Map(x => x.id);
    }

    public async FindUnreferencedStorageBlocks()
    {
        const query = `
        SELECT sb.id
        FROM storageblocks sb
        LEFT JOIN blobblocks_storageblocks bbsb
            ON sb.id = bbsb.storageBlockId
        WHERE bbsb.blobBlockId IS NULL
        `;
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const rows = await conn.Select<{ id: number }>(query);
        return rows.Values().Map(x => x.id);
    }
}