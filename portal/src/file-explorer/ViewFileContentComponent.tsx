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

import { JSX_CreateElement, Use, UseAPI, UseRouteParameter } from "acfrontend";
import { FileMetaDataDTO } from "../../dist/api";
import { VideoStreamComponent } from "./content/VideoStreamComponent";
import { APIService } from "../services/APIService";
import { PlainTextComponent } from "./content/PlainTextComponent";

function FileContentShower(input: { metadata: FileMetaDataDTO })
{
    if(input.metadata.mediaType.startsWith("video/"))
        return <VideoStreamComponent />;

    switch(input.metadata.mediaType)
    {
        case "text/plain":
            return <PlainTextComponent fileId={input.metadata.id} />;
    }

    return "Content can't be displayed";
}

export function ViewFileContentComponent()
{
    const fileId = UseRouteParameter("route", "fileId", "unsigned");
    
    const apiState = UseAPI( () => Use(APIService).files._any_.get(fileId) );
    return apiState.success ? <FileContentShower metadata={apiState.data} /> : apiState.fallback;
}