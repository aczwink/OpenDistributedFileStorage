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

import { CreateDatabaseExpression, DateTime, Injectable } from "acts-util-node";
import { DBConnectionsManager } from "./DBConnectionsManager";

export interface FileOverviewData
{
    id: number;
    filePath: string;
    mediaType: string;
}

export interface FileMetaData extends FileOverviewData
{
    containerId: number;
}

interface FileRevision
{
    blobId: number;
    creationTimestamp: DateTime;
}

@Injectable
export class FilesController
{
    constructor(private dbConnMgr: DBConnectionsManager)
    {
    }

    //Public methods
    public async AddFile(containerId: number, originalName: string, mediaType: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const result = await conn.InsertRow("files", {
            containerId,
            filePath: "/" + originalName,
            mediaType,
        });

        return result.insertId;
    }

    public async AddRevision(fileId: number, blobId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        await conn.InsertRow("files_revisions", {
            fileId,
            blobId,
            creationTimestamp: CreateDatabaseExpression({
                type: "CurrentDateTime"
            })
        });
    }

    public async FindIdByName(containerId: number, filePath: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        const row = await conn.SelectOne("SELECT id FROM files WHERE containerId = ? AND filePath = ?", containerId, filePath);
        return row?.id as number | undefined;
    }

    public async Query(fileId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        return await conn.SelectOne<FileMetaData>("SELECT * FROM files WHERE id = ?", fileId);
    }

    public async QueryChildrenOf(containerId: number, dirPath: string)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        return await conn.Select<FileOverviewData>("SELECT id, filePath, mediaType FROM files WHERE containerId = ? AND filePath LIKE ?", containerId, dirPath + "%");
    }

    public async QueryNewestRevision(fileId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        return await conn.SelectOne<FileRevision>("SELECT blobId, creationTimestamp FROM `files_revisions` WHERE fileId = ? ORDER BY creationTimestamp DESC LIMIT 1", fileId);
    }

    public async QueryRevisions(fileId: number)
    {
        const conn = await this.dbConnMgr.CreateAnyConnectionQueryExecutor();
        return await conn.Select<FileRevision>("SELECT blobId, creationTimestamp FROM `files_revisions` WHERE fileId = ? ORDER BY creationTimestamp", fileId);
    }
}