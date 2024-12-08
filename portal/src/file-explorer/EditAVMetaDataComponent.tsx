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

import { BootstrapIcon, FormField, JSX_CreateElement, LineEdit, PushButton, Router, TextArea, Use, UseAPI, UseDeferredAPI, UseRouteParameter, UseState } from "acfrontend";
import { APIService } from "../APIService";
import { AudioMetadataTags } from "../../dist/api";

function FormComponent(input: { containerId: number; fileId: number; audioTags: AudioMetadataTags; })
{
    const apiState = UseDeferredAPI(
        () => Use(APIService).files._any_.meta.post(input.fileId, state),
        () => Use(Router).RouteTo("/" + input.containerId + "/" + input.fileId)
    );
    if(apiState.started)
        return apiState.fallback;

    const state = UseState(input.audioTags);
    return <div className="container">
        <FormField title="Artist">
            <LineEdit link={state.links.artist} />
        </FormField>
        <FormField title="Title">
            <LineEdit link={state.links.title} />
        </FormField>
        <FormField title="Comment">
            <TextArea value={state.comment} onChanged={newValue => state.comment = newValue} rows={5} />
        </FormField>
        <PushButton color="primary" enabled onActivated={apiState.start}><BootstrapIcon>floppy</BootstrapIcon> Save</PushButton>
    </div>;
}

export function EditAVMetaDataComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.meta.get(fileId) );
    return apiState.success ? <FormComponent containerId={containerId} fileId={fileId} audioTags={apiState.data} /> : apiState.fallback;
}