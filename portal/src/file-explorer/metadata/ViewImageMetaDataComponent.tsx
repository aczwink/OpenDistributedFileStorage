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
import { APIService } from "../../APIService";
import { ImageTags } from "../../../dist/api";
import { JSX_CreateElement, JSX_Fragment, Use, UseAPI, UseRouteParameter } from "acfrontend";

function InfoComponent(input: { containerId: number; fileId: number; tags: ImageTags; })
{
    const t = input.tags;

    if(t.geolocation !== undefined)
    {
        const lat = t.geolocation.latitude.substring(0, t.geolocation.latitude.length - 2);
        const lon = t.geolocation.longitude.substring(0, t.geolocation.longitude.length - 2);

        const points = [{
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        }];
        const data = {
            points,
        };
        return <>
            Taken on: {t.geolocation.dateTime} <br />
            <iframe src={"/leaflet.htm?data=" + encodeURIComponent(JSON.stringify(data))} style="width: 100%; height: 80vh" />;
        </>;
    }

    return "No tags";
}

export function ViewImageMetaDataComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.meta.get(fileId) );
    return apiState.success ? <InfoComponent containerId={containerId} fileId={fileId} tags={apiState.data as ImageTags} /> : apiState.fallback;
}