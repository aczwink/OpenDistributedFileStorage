/**
 * OpenDistributedFileStorage
 * Copyright (C) 2025 Amir Czwink (amir130@hotmail.de)
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

import { Anchor, BootstrapIcon, JSX_CreateElement, JSX_Fragment, Use, UseAPI, UseRouteParameter } from "acfrontend";
import { APIService } from "../services/APIService";
import { DeletedFileOverviewData } from "../../dist/api";
import { ThumbnailComponent } from "../file-explorer/ThumbnailComponent";

function MapsView(input: { containerId: number; files: DeletedFileOverviewData[] })
{
    return <table className="table table-striped table-sm">
        <thead>
            <tr>
                <th> </th>
                <th>Id</th>
                <th>Deletion time</th>
            </tr>
        </thead>
        <tbody>
            {input.files.map(fileData => <tr>
                <td><ThumbnailComponent fileId={fileData.id} mediaType={fileData.mediaType} /></td>
                <td><Anchor route={"/" + input.containerId + "/" + fileData.id}>{fileData.filePath}</Anchor></td>
                <td>{fileData.deletionTime.toString()}</td>
            </tr>)}
        </tbody>
    </table>;
}

function ContentComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    
    const apiState = UseAPI( () => Use(APIService).containers._any_.recyclebin.get(containerId) );
    return apiState.success ? <MapsView containerId={containerId} files={apiState.data} /> : apiState.fallback;
}

export function ViewRecycleBinComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");

    const containerName = "TODO: container name";
    return <>
        <div className="container">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Anchor route="/"><BootstrapIcon>house</BootstrapIcon></Anchor></li>
                    <li className="breadcrumb-item"><Anchor route={"/" + containerId}>{containerName}</Anchor></li>
                    <li className="breadcrumb-item active">Recycle bin</li>
                </ol>
            </nav>
        </div>
        <ContentComponent />
    </>;
}