/**
 * OpenObjectStorage
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

import { AutoCompleteTextLineEdit, BootstrapIcon, FormField, JSX_CreateElement, LineEdit, PushButton, Router, Use, UseAPI, UseDeferredAPI, UseRouteParameter, UseState } from "acfrontend";
import { APIService } from "../APIService";
import { FileMetaDataDTO } from "../../dist/api";

async function LoadTags(containerId: number, searchText: string)
{
    const response = await Use(APIService).tags.get({ containerId, substring: searchText });
    return response.data;
}

function FileEditor(input: { containerId: number; fileId: number; fileData: FileMetaDataDTO })
{
    function add()
    {
        state.tags = state.tags.concat([""]);
    }
    function del(index: number)
    {
        state.tags.Remove(index);
        state.tags = [...state.tags]; //inform view about change
    }
    function change(index: number, newValue: string)
    {
        state.tags[index] = newValue;
        state.tags = [...state.tags]; //inform view about change
    }

    const state = UseState({
        filePath: input.fileData.filePath,
        tags: input.fileData.tags
    });
    const isValid = state.tags.find(x => x.trim().length === 0) === undefined;

    const apiState = UseDeferredAPI(
        () => Use(APIService).files._any_.put(input.fileId, {
            filePath: state.filePath,
            tags: state.tags
        }),
        () => Use(Router).RouteTo("/" + input.containerId + "/" + input.fileId)
    );
    if(apiState.started)
        return apiState.fallback;

    return <div className="container">
        <FormField title="File path">
            <LineEdit link={state.links.filePath} />
        </FormField>
        <h4>Tags</h4>
        {state.tags.map( (x, i) => <div className="row">
            <div className="col">
                <AutoCompleteTextLineEdit onChanged={change.bind(undefined, i)} onLoadSuggestions={LoadTags.bind(undefined, input.containerId)} value={x} />
            </div>
            <div className="col-auto">
                <PushButton color="danger" enabled onActivated={del.bind(undefined, i)}><BootstrapIcon>trash</BootstrapIcon></PushButton>
            </div>
        </div>)}
        <PushButton color="secondary" enabled onActivated={add}><BootstrapIcon>plus</BootstrapIcon></PushButton>
        <hr />
        <PushButton color="primary" enabled={isValid} onActivated={apiState.start}><BootstrapIcon>floppy</BootstrapIcon> Save</PushButton>
    </div>;
}

export function EditFileAttributesComponent()
{
    const containerId = UseRouteParameter("route", "containerId", "unsigned");
    const fileId = UseRouteParameter("route", "fileId", "unsigned");

    const apiState = UseAPI( () => Use(APIService).files._any_.get(fileId) );
    return apiState.success ? <FileEditor containerId={containerId} fileId={fileId} fileData={apiState.data} /> : apiState.fallback;
}