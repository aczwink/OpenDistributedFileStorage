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

import { BootstrapIcon, DataLink, FormField, JSX_CreateElement, JSX_Fragment, LineEdit, PushButton, Router, Select, Use, UseDeferredAPI, UseState } from "acfrontend";
import { APIService } from "../APIService";
import { APIResponse } from "acfrontend/dist/RenderHelpers";
import { StorageBackendConfig, StorageBackendCreationData, StorageTier } from "../../dist/api";
import { Of } from "acts-util-core";

function CreateDefaultConfig(type: string): StorageBackendConfig
{
    switch(type)
    {
        case "host-filesystem":
            return {
                type: "host-filesystem",
                rootPath: "/path-to-data-dir"
            };
        case "smb":
            return {
                type: "smb",
                hostName: "",
                password: "",
                userName: "",
                rootPath: "/"
            };
        case "webdav":
            return {
                type: "webdav",
                serverURL: "",
                password: "",
                userName: "",
                rootPath: "/"
            };
    }
    throw new Error("Unknown type: " + type);
}

function ConfigEditor(input: { config: DataLink<StorageBackendConfig> })
{
    const c = input.config;
    const v = c.value;
    switch(v.type)
    {
        case "host-filesystem":
            return <FormField title="Root path">
                <LineEdit value={v.rootPath} onChanged={newValue => v.rootPath = newValue} />
            </FormField>;
        case "smb":
            return <>
                <FormField title="Host name">
                    <LineEdit value={v.hostName} onChanged={newValue => v.hostName = newValue} />
                </FormField>
                <FormField title="User name">
                    <LineEdit value={v.userName} onChanged={newValue => v.userName = newValue} />
                </FormField>
                <FormField title="Password">
                    <LineEdit value={v.password} onChanged={newValue => v.password = newValue} password />
                </FormField>
                <FormField title="Root path">
                    <LineEdit value={v.rootPath} onChanged={newValue => v.rootPath = newValue} />
                </FormField>
            </>;
        case "webdav":
            return <>
                <FormField title="Server URL">
                    <LineEdit value={v.serverURL} onChanged={newValue => v.serverURL = newValue} />
                </FormField>
                <FormField title="User name">
                    <LineEdit value={v.userName} onChanged={newValue => v.userName = newValue} />
                </FormField>
                <FormField title="Password">
                    <LineEdit value={v.password} onChanged={newValue => v.password = newValue} password />
                </FormField>
                <FormField title="Root path">
                    <LineEdit value={v.rootPath} onChanged={newValue => v.rootPath = newValue} />
                </FormField>
            </>;
    }
}

function StorageBackendFormComponent(input: { saveAPI: (data: StorageBackendCreationData) => Promise<APIResponse<number>>  })
{
    function OnTypeChanged(newValue: string[])
    {
        state.config = CreateDefaultConfig(newValue[0])
    }

    const state = UseState({
        ...Of<StorageBackendCreationData>({
            config: CreateDefaultConfig("host-filesystem"),
            name: "",
            storageTier: StorageTier.Archive
        }),
    });
    const apiState = UseDeferredAPI(
        () => input.saveAPI(state),
        () => Use(Router).RouteTo("/settings/storagebackends")
    );

    if(apiState.started)
        return apiState.fallback;

    const isValid = (state.name.trim().length > 0);
    const choices = ["host-filesystem", "smb", "webdav"];
    return <>
        <FormField title="Name">
            <LineEdit link={state.links.name} />
        </FormField>
        <FormField title="Type">
            <Select onChanged={OnTypeChanged}>
                {choices.map(x => <option selected={x === state.config.type}>{x}</option>)}
            </Select>
        </FormField>
        <ConfigEditor config={state.links.config} />
        <PushButton color="primary" enabled={isValid} onActivated={apiState.start}><BootstrapIcon>floppy</BootstrapIcon> Save</PushButton>
    </>;
}

export function CreateStorageBackendComponent()
{
    async function Save(data: StorageBackendCreationData)
    {
        const response = await Use(APIService).storagebackends.post(data);
        return response;
    }
    return <StorageBackendFormComponent saveAPI={Save} />;
}