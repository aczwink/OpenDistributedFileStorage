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

import { BootstrapIcon, FileDownloadService, JSX_CreateElement, JSX_Fragment, RouterButton, Use, UseAPI, UseRouteParameter } from "acfrontend";
import { BlobVersion } from "../../dist/api";
import { APIService } from "../services/APIService";

async function OnDownloadFileVersion(fileId: number, rev: BlobVersion)
{
    const response = await Use(APIService).files._any_.versions.blob.get(fileId, { blobId: rev.versionBlobId });
    if(response.statusCode !== 200)
        throw new Error("TODO: implement me");
    Use(FileDownloadService).DownloadBlobAsFile(response.data, "TODO:version_file_name");
}

function FileVersionsTable(input: { containerId: number; fileId: number; versions: BlobVersion[] })
{
    return <>
        <table className="table table-sm table-striped">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {input.versions.map((x, i) => <tr>
                    <td>{x.title}</td>
                    <td><a className="text-primary" role="button" onclick={OnDownloadFileVersion.bind(null, input.fileId, x)}><BootstrapIcon>download</BootstrapIcon></a></td>
                </tr>)}
            </tbody>
        </table>
        <RouterButton color="primary" route={"/" + input.containerId + "/" + input.fileId + "/versions/create"}><BootstrapIcon>plus</BootstrapIcon></RouterButton>
    </>;
}

export function ViewFileVersionsComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.versions.get(fileId) );
    return apiState.success ? <FileVersionsTable containerId={containerId} fileId={fileId} versions={apiState.data} /> : apiState.fallback;
}