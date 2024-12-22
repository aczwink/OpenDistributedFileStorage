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

import { BootstrapIcon, FormField, JSX_CreateElement, PushButton, Router, Select, Use, UseAPI, UseDeferredAPI, UseRouteParameter, UseState } from "acfrontend";
import { FileMetaDataDTO, StreamingVersionType } from "../../dist/api";
import { Of } from "acts-util-core";
import { APIService } from "../services/APIService";

function CreateFileVersionForm(input: { containerId: number; fileId: number; metadata: FileMetaDataDTO })
{
    const state = UseState({
        quality: Of<StreamingVersionType>("360p")
    });
    const apiState = UseDeferredAPI(
        () => Use(APIService).files._any_.versions.post(input.fileId, { type: state.quality }),
        () => Use(Router).RouteTo("/" + input.containerId + "/" + input.fileId + "/versions")
    );

    if(apiState.started)
        return apiState.fallback;
    
    if(input.metadata.mediaType.startsWith("video/"))
    {
        const qualities: StreamingVersionType[] = ["360p", "480p"];
        return <div className="container">
            <FormField title="Quality">
                <Select onChanged={newValue => state.quality = newValue[0] as any}>
                    {qualities.map(x => <option selected={x === state.quality}>{x}</option>)}
                </Select>
            </FormField>
            <PushButton color="primary" enabled onActivated={apiState.start}><BootstrapIcon>floppy</BootstrapIcon> Save</PushButton>
        </div>;
    }

    return "Can't create any versions for this file type";
}

export function CreateFileVersionComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.get(fileId) );
    return apiState.success ? <CreateFileVersionForm containerId={containerId} fileId={fileId} metadata={apiState.data} /> : apiState.fallback;
}