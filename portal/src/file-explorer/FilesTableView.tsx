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

import { Anchor, JSX_CreateElement } from "acfrontend";
import { DirectoryContentsDTO, FileOverviewData } from "../../dist/api";
import { ThumbnailComponent } from "./ThumbnailComponent";

export function FilesTableView(input: { containerId: number; contents: DirectoryContentsDTO; parentPath: string; })
{
    return <table className="table table-striped table-sm">
        <thead>
            <tr>
                <th> </th>
                <th>Id</th>
            </tr>
        </thead>
        <tbody>
            {input.contents.files.map(fileData => <tr>
                <td><ThumbnailComponent fileId={fileData.id} mediaType={fileData.mediaType} /></td>
                <td><Anchor route={"/" + input.containerId + "/" + fileData.id}>{fileData.filePath.substring(input.parentPath.length)}</Anchor></td>
            </tr>)}
        </tbody>
    </table>;
}