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

import { BootstrapIcon, JSX_CreateElement, Use, UseAPI, UseRouteParameter } from "acfrontend";
import { FileRevision } from "../../dist/api";
import { APIService } from "../services/APIService";
import { DownloadFileUsingProgressPopup } from "./DownloadFileUsingProgressPopup";

async function OnDownloadFileRevision(fileId: number, rev: FileRevision)
{
    DownloadFileUsingProgressPopup("TODO:revision_file_name", progressTracker => Use(APIService).files._any_.revisions.blob.get(fileId, { blobId: rev.blobId }, { progressTracker }));
}

function FileRevisionsTable(input: { fileId: number; revisions: FileRevision[] })
{
    return <table className="table table-sm table-striped">
        <thead>
            <tr>
                <th>Revision number</th>
                <th>Creation date</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            {input.revisions.map((x, i) => <tr>
                <td>{input.revisions.length - i}</td>
                <td>{x.creationTimestamp.toLocaleString()}</td>
                <td><a className="text-primary" role="button" onclick={OnDownloadFileRevision.bind(null, input.fileId, x)}><BootstrapIcon>download</BootstrapIcon></a></td>
            </tr>)}
        </tbody>
    </table>;
}

export function ViewFileRevisionsComponent()
{
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.revisions.get(fileId), data => data.SortByDescending(x => x.creationTimestamp.toISOString()) );
    return apiState.success ? <FileRevisionsTable fileId={fileId} revisions={apiState.data} /> : apiState.fallback;
}