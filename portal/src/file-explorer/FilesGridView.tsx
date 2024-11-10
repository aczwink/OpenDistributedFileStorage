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

import { Anchor, BootstrapIcon, JSX_CreateElement } from "acfrontend";
import { DirectoryContentsDTO, FileOverviewData } from "../../dist/api";
import { ThumbnailComponent } from "./ThumbnailComponent";

function JoinPaths(parent: string, child: string)
{
    if(parent === "/")
        return parent + child;
    return parent + "/" + child;
}

function StripParent(parent: string, filePath: string)
{
    if(parent === "/")
        return filePath.substring(1);
    return filePath.substring(parent.length + 1);
}

function RenderDir(containerId: number, parentPath: string, name: string)
{
    return <div className="col-auto">
        <Anchor route={"/" + containerId + "?dirPath=" + JoinPaths(parentPath, name)} className="text-center">
            <h3 className="text-center"><BootstrapIcon>folder</BootstrapIcon></h3>
            {name}
        </Anchor>
    </div>;
}

function RenderFile(containerId: number, parentPath: string, fileData: FileOverviewData)
{
    return <div className="col-auto">
        <Anchor route={"/" + containerId + "/" + fileData.id}>
            <h3 className="text-center"><ThumbnailComponent fileId={fileData.id} mediaType={fileData.mediaType} /></h3>
            {StripParent(parentPath, fileData.filePath)}
        </Anchor>
    </div>;
}

export function FilesGridView(input: { containerId: number; contents: DirectoryContentsDTO; parentPath: string; })
{
    return <div className="row justify-content-center">
        {input.contents.dirs.map(RenderDir.bind(undefined, input.containerId, input.parentPath))}
        {input.contents.files.map(RenderFile.bind(undefined, input.containerId, input.parentPath))}
    </div>;
}