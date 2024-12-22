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

import { UseAPI, Use, JSX_CreateElement, BootstrapIcon, Anchor } from "acfrontend";
import { Container } from "../../dist/api";
import { APIService } from "../services/APIService";

function ContainersList(input: { containers: Container[] })
{
    const containers = input.containers.map(x => <div className="col-auto">
        <div className="card">
            <div className="card-body">
                <Anchor route={"/" + x.id}>
                    <h2 className="text-center"><BootstrapIcon>folder2-open</BootstrapIcon></h2>
                    <h5 className="card-title">{x.name}</h5>
                </Anchor>
            </div>
        </div>
    </div>);
    return <div className="row justify-content-center">{containers}</div>;
}

export function ContainerSelectionComponent()
{
    const apiState = UseAPI( () => Use(APIService).containers.get() );
    return apiState.success ? <ContainersList containers={apiState.data} /> : apiState.fallback;
}