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

import { Component, InfoMessageManager, Injectable, JSX_CreateElement, ProgressSpinner, RouteParamProperty, Router } from "acfrontend";
import { APIService } from "../APIService";
import { DirectoryViewComponent } from "./DirectoryViewComponent";

let dragCounter = 0;

@Injectable
export class FileExplorerComponent extends Component
{
    constructor(private apiService: APIService, private infoMessageManager: InfoMessageManager, private router: Router,
        @RouteParamProperty("containerId") private containerId: number)
    {
        super();

        this.loading = false;
    }

    protected Render(): RenderValue
    {
        if(this.loading)
            return <ProgressSpinner />;

        if(this.apiService.readOnly)
            return <DirectoryViewComponent />;
        return <div ondragenter={this.OnDragEnter.bind(this)} ondragleave={this.OnDragLeave.bind(this)} ondragover={this.OnDragOver.bind(this)} ondrop={this.OnDrop.bind(this)} style="min-height: 95vh">
            <DirectoryViewComponent />
        </div>;
    }

    //Private methods
    private async UploadFile(file: File)
    {
        const response = await this.apiService.containers._any_.files.post(this.containerId, {
            file
        });
        switch(response.statusCode)
        {
            case 200:
                return response.data;
            case 409:
                this.infoMessageManager.ShowMessage(<p>{file.name} was not uploaded because it exists already!</p>, { type: "warning" });
                break;
            default:
                this.infoMessageManager.ShowMessage(<p>Failed uploading file {file.name}</p>, { type: "danger" });
        }
    }

    private async UploadFiles(files: File[])
    {
        this.loading = true;

        if(files.length === 1)
        {
            const result = await this.UploadFile(files[0]);
            if(result !== undefined)
                this.router.RouteTo("/" + this.containerId + "/" + result);
        }
        else
        {
            const fileIds = [];
            for (const file of files)
            {
                const result = await this.UploadFile(file);    
                if(result !== undefined)
                    fileIds.push(result);
            }

            if(fileIds.length === files.length)
                this.infoMessageManager.ShowMessage(<p>{fileIds.length} files uploaded successfully.</p>, { type: "success" });
            else
                this.infoMessageManager.ShowMessage(<p>{files.length - fileIds.length} files of {files.length} could not be uploaded successfully.</p>, { type: "danger" });
        }

        this.loading = false;
    }

    //Event handlers
    private OnDragEnter(event: DragEvent)
    {
        dragCounter++;
        const elem = (this.vNode?.domNode as HTMLElement);
        elem.className = "border border-2 border-primary rounded shadow";
    }

    private OnDragLeave(event: DragEvent)
    {
        dragCounter--;
        if(dragCounter === 0)
        {
            const elem = (this.vNode?.domNode as HTMLElement);
            elem.className = "";
        }
    }

    private OnDragOver(event: DragEvent)
    {
        event.preventDefault();
        if(event.dataTransfer)
            event.dataTransfer.dropEffect = "copy";
    }

    private async OnDrop(event: DragEvent)
    {
        event.preventDefault();

        this.OnDragLeave(event); //remove style

        if(event.dataTransfer === null)
            return;

        const files: File[] = [];
        if (event.dataTransfer.items)
        {
            [...event.dataTransfer.items].forEach(item =>
            {
                if (item.kind === "file")
                {
                    const file = item.getAsFile();
                    if(file === null)
                        return;
                    files.push(file);
                }
            });
        }
        else
        {
            [...event.dataTransfer.files].forEach(file => {
                files.push(file);
            });
        }

        await this.UploadFiles(files);
    }

    //State
    private loading: boolean;
}