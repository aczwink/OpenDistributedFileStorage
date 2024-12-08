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

import { UseRouteParameter, UseAPI, Use, JSX_CreateElement, JSX_Fragment, BootstrapIcon } from "acfrontend";
import { APIService } from "../APIService";
import { AccessStatistics, StorageTier } from "../../dist/api";

function RenderStorageTier(storageTier: StorageTier)
{
    switch(storageTier)
    {
        case StorageTier.Archive:
            return <>
                <span className="text-warning"><BootstrapIcon>archive</BootstrapIcon></span>
                Archive
            </>;
        case StorageTier.Cool:
            return <>
                <span className="text-primary"><BootstrapIcon>snow</BootstrapIcon></span>
                Cool
            </>;
        case StorageTier.Hot:
            return <>
                <span className="text-danger"><BootstrapIcon>fire</BootstrapIcon></span>
                Hot
            </>;
    }
}

function AccessStats(input: { stats: AccessStatistics })
{
    const s = input.stats;
    return <div className="w-25 m-auto">
        <table className="table table-sm table-striped">
            <tbody>
                <tr>
                    <th>Recently accessed</th>
                    <td>{Math.round(s.recent)} times</td>
                </tr>
                <tr>
                    <th>Accessed this year</th>
                    <td>{Math.round(s.nearPast)} times</td>
                </tr>
                <tr>
                    <th>Accessed in the past</th>
                    <td>{Math.round(s.past)} times</td>
                </tr>
                <tr>
                    <th>Last accessed</th>
                    <td>{(s.lastAccessTime === 0) ? <i>never</i> : new Date(s.lastAccessTime).toLocaleString()}</td>
                </tr>
                <tr>
                    <th>Storage tier</th>
                    <td>{RenderStorageTier(s.storageTier)}</td>
                </tr>
            </tbody>
        </table>
    </div>;
}

export function FileAccessesComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.access.get(fileId) );
    return apiState.success ? <AccessStats stats={apiState.data} /> : apiState.fallback;
}