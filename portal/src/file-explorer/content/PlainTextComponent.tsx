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

import { JSX_CreateElement, ProgressSpinner, Use, UseAPI, UseEffectOnce, UseState } from "acfrontend";
import { APIService } from "../../services/APIService";

function Content(input: { data: Blob })
{
    const state = UseState({
        loading: true,
        data: ""
    });
    UseEffectOnce(async () => {
        state.data = await input.data.text();
        state.loading = false;
    });
    if(state.loading)
        return <ProgressSpinner />;
    return <textarea className="form-control" cols="80" rows="12" disabled readOnly>{state.data}</textarea>;
}

export function PlainTextComponent(input: { fileId: number })
{
    const apiState = UseAPI( () => Use(APIService).files._any_.blob.get(input.fileId) );
    return apiState.success ? <Content data={apiState.data} /> : apiState.fallback;
}