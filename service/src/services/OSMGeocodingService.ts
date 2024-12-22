/**
 * OpenDistributedFileStorage
 * Copyright (C) 2023-2024 Amir Czwink (amir130@hotmail.de)
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
import { Dictionary } from "acts-util-core";
import { Injectable, Lock } from "acts-util-node";
import { APIServiceBase } from "acts-util-node/dist/http/APIServiceBase";

export interface OSM_Address
{
    //ordered from smallest to largest
    hamlet?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    country: string;
    /**
     * Lowercase
     */
    country_code: string;
}

export interface OSM_Location
{
    osm_type: "relation";
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    category: string;
    type: string;
    address: OSM_Address;
}

@Injectable
export class OSMGeocodingService
{
    constructor()
    {
        this.lastCall = 0;
        this.lastCallLock = new Lock;
    }

    //Public methods
    public FormId(location: OSM_Location): string
    {
        return this.MapTypeToPrefix(location.osm_type) + location.osm_id;
    }

    public async FreeSearch(name: string)
    {
        const result = await this.CallOSM("/search", { q: name, addressdetails: 1 });
        return result as OSM_Location[];
    }

    public async ResolveLocation(osm_id: string)
    {
        const result = await this.CallOSM("/lookup", { "osm_ids": osm_id });
        return result[0] as OSM_Location;
    }

    public async ReverseLookup(lat: number, lon: number)
    {
        const result = await this.CallOSM("/reverse", { lat, lon, addressdetails: 1 });
        return result as OSM_Location;
    }

    //Private methods
    private async CallOSM(path: string, queryParams: Dictionary<number | string>)
    {
        await this.RateLimit();

        const apiService = new APIServiceBase("nominatim.openstreetmap.org", 443, "https");
        const response = await apiService.SendRequest({
            formatRules: [],
            method: "GET",
            path,
            responseType: "json",
            successStatusCode: 200,
            query: {
                "accept-language": "en",
                format: "jsonv2",
                ...queryParams
            }
        }, {
            Host: "nominatim.openstreetmap.org",
            "User-Agent": "OpenDistributedFileStorage-Service"
        });
        if(response.statusCode !== 200)
            throw new Error("OSM error: " + response.statusCode);

        return response.body;
    }

    private MapTypeToPrefix(osm_type: "node" | "relation" | "way")
    {
        switch(osm_type)
        {
            case "node":
                return "N";
            case "relation":
                return "R";
            case "way":
                return "W";
            default:
                throw new Error("TODO");
        }
    }
    
    private async RateLimit()
    {
        const lock = await this.lastCallLock.Lock();

        const now = Date.now();
        const diff = now - this.lastCall;
        
        if(diff <= 1000)
        {
            await new Promise( resolve => setTimeout(resolve, 1000 - diff) );
        }

        this.lastCall = now;
        lock.Release();
    }

    //State
    private lastCall: number;
    private lastCallLock: Lock;
}