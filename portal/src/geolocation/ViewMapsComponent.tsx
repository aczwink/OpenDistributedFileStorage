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

import { Anchor, BootstrapIcon, JSX_CreateElement, JSX_Fragment, Use, UseAPI, UseRouteParameter } from "acfrontend";
import { APIService } from "../services/APIService";
import { GeoLocationMap } from "./GeoLocationMap";
import { CountriesMap } from "./CountriesMap";
import { GeoLocation } from "../../dist/api";

function MapsView(input: { positions: GeoLocation[] })
{
    return <div className="row">
        <div className="col">
            <GeoLocationMap points={input.positions} />
        </div>
        <div className="col">
            <CountriesMap points={input.positions} />
        </div>
    </div>;
}

function ContentComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    
    const apiState = UseAPI( () => Use(APIService).containers._any_.locations.get(containerId) );
    return apiState.success ? <MapsView positions={apiState.data} /> : apiState.fallback;
}

export function ViewMapsComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");

    const containerName = "TODO: container name";
    return <>
        <div className="container">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Anchor route="/"><BootstrapIcon>house</BootstrapIcon></Anchor></li>
                    <li className="breadcrumb-item"><Anchor route={"/" + containerId}>{containerName}</Anchor></li>
                    <li className="breadcrumb-item active">Maps</li>
                </ol>
            </nav>
        </div>
        <ContentComponent />
    </>;
}