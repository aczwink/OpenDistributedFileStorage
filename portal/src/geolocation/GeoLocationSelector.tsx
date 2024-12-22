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

import { AutoCompleteSelectBox, Component, FormField, Injectable, JSX_CreateElement, KeyDisplayValuePair, ProgressSpinner } from "acfrontend";
import { APIService } from "../services/APIService";
import { FullGeoLocationInfo } from "../../dist/api";

@Injectable
export class GeoLocationSelector extends Component<{ locationId: string | null, onValueChanged: (locationId: string) => void }>
{
    constructor(private apiService: APIService)
    {
        super();

        this.currentValue = null;
        this.loading = false;
    }

    protected Render()
    {
        if(this.loading)
            return <ProgressSpinner />;

        return <FormField title={"Location"}>
            <AutoCompleteSelectBox<string> onChanged={this.OnLocationChanged.bind(this)} selection={this.currentValue} onLoadSuggestions={this.LoadLocations.bind(this)} />
        </FormField>;
    }

    //Private state
    private currentValue: KeyDisplayValuePair<string> | null;
    private loading: boolean;

    //Private methods
    private async LoadLocations(filterText: string)
    {
        const response = await this.apiService.geocoding.get({ name: filterText});
        const result = response.data;
        return result.map(this.LocationToKeyValuePair.bind(this));
    }

    private LocationToDisplayString(location: FullGeoLocationInfo)
    {
        switch(location.type)
        {
            case "city":
                return "City";
            case "country":
                return "Country";
            case "region":
                return "Region";
            case "unknown":
                return location.internalType;
            case "village":
                return "Village";
        }
    }

    private LocationToKeyValuePair(location: FullGeoLocationInfo): KeyDisplayValuePair<string>
    {
        return {
            displayValue: this.LocationToDisplayString(location) + ": " + location.displayName,
            key: location.id
        };
    }

    private async QueryCurrentValue()
    {
        this.loading = true;
        const response = await this.apiService.geocoding._any_.get(this.input.locationId!);
        if(response.statusCode === 200)
            this.currentValue = this.LocationToKeyValuePair(response.data);
        else
            this.currentValue = null;
        this.loading = false;
    }

    //Event handlers
    override OnInitiated(): void
    {
        if(this.input.locationId !== null)
        {
            this.QueryCurrentValue();
        }
    }

    override OnInputChanged(): void
    {
        if(this.input.locationId === null)
            this.currentValue = null;
        else if(this.input.locationId !== this.currentValue?.key)
            this.QueryCurrentValue();
    }

    private OnLocationChanged(newValue: KeyDisplayValuePair<string>)
    {
        this.currentValue = newValue;
        this.input.onValueChanged(newValue.key);
    }
}