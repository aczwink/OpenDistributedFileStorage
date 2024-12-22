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
import { ContainerProperties } from "../../dist/api";
import { APIService } from "../services/APIService";

function ContainersList(input: { containers: ContainerProperties[] })
{
    return <>
        <table className="table table-hover table-striped">
            <thead>
                <tr>
                    <th>Id</th>
                </tr>
            </thead>
            <tbody>
                {input.containers.map(x => <tr>
                    <td>{x.name}</td>
                </tr>)}
            </tbody>
        </table>
        <RouterButton color="primary" route="settings/containers/create"><BootstrapIcon>plus</BootstrapIcon></RouterButton>
    </>;
}

export function ListContainersComponent()
{
    const apiState = UseAPI( () => Use(APIService).containers.get() );
    return apiState.success ? <ContainersList containers={apiState.data} /> : apiState.fallback;
}