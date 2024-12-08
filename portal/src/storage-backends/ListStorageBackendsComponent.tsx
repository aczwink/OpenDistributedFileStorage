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

import { BootstrapIcon, JSX_CreateElement, JSX_Fragment, RouterButton, Use, UseAPI } from "acfrontend";
import { APIService } from "../APIService";
import { StorageBackendDTO } from "../../dist/api";

function StorageBackendsList(input: { storageBackends: StorageBackendDTO[] })
{
    return <>
        <table className="table table-hover table-striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Size in use</th>
                </tr>
            </thead>
            <tbody>
                {input.storageBackends.map(x => <tr>
                    <td>{x.name}</td>
                    <td>{x.config.type}</td>
                    <td>{x.size.FormatBinaryPrefixed()}</td>
                </tr>)}
            </tbody>
        </table>
        <RouterButton color="primary" route="/settings/storagebackends/create"><BootstrapIcon>plus</BootstrapIcon></RouterButton>
    </>;
}

export function ListStorageBackendsComponent()
{
    const apiState = UseAPI( () => Use(APIService).storagebackends.get() );
    return apiState.success ? <StorageBackendsList storageBackends={apiState.data} /> : apiState.fallback;
}