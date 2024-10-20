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

import { BootstrapIcon, FormField, JSX_CreateElement, JSX_Fragment, LineEdit, OAuth2Guard, PushButton, Router, Use, UseDeferredAPI, UseState } from "acfrontend";
import { APIService } from "../APIService";
import { APIResponse } from "acfrontend/dist/RenderHelpers";
import { ContainerProperties } from "../../dist/api";

export function ContainerFormComponent(input: { saveAPI: (data: ContainerProperties) => Promise<APIResponse<void>>  })
{
    const state = UseState({
        name: "",
        requiredClaim: ""
    });
    const apiState = UseDeferredAPI(
        () => input.saveAPI({ name: state.name, requiredClaim: state.requiredClaim }),
        () => Use(Router).RouteTo("/containers/" + state.name)
    );

    if(apiState.started)
        return apiState.fallback;

    const isValid = (state.name.trim().length > 0);
    return <>
        <FormField title="Name">
            <LineEdit link={state.links.name} />
        </FormField>
        <FormField title="Required container claim" description="The claim 'container' must contain that value in order for an identity to get access to the container">
            <LineEdit link={state.links.requiredClaim} />
        </FormField>
        <PushButton color="primary" enabled={isValid} onActivated={apiState.start}><BootstrapIcon>floppy</BootstrapIcon> Save</PushButton>
    </>;
}

export function CreateContainersComponent()
{
    async function Save(data: ContainerProperties)
    {
        const response = await Use(APIService).containers.post(data);
        return response;
    }
    return <ContainerFormComponent saveAPI={Save} />;
}