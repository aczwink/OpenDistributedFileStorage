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

import { Component, InfoMessageManager, Injectable, JSX_CreateElement, PopupManager, ProgressSpinner, RouteParamProperty, Router } from "acfrontend";
import { DirectoryViewComponent } from "./DirectoryViewComponent";
import { APIService } from "../services/APIService";
import { UploadFileModal } from "./UploadFileModal";

let dragCounter = 0;

@Injectable
export class FileExplorerComponent extends Component
{
    constructor(private apiService: APIService, private infoMessageManager: InfoMessageManager, private router: Router, private popupManager: PopupManager,
        @RouteParamProperty("containerId") private containerId: number)
    {
        super();

        this.loading = false;
        this.dirPath = "/";
    }

    protected Render(): RenderValue
    {
        if(this.loading)
            return <ProgressSpinner />;

        if(this.apiService.readOnly)
            return <DirectoryViewComponent dirPath={this.dirPath} />;
        return <div ondragenter={this.OnDragEnter.bind(this)} ondragleave={this.OnDragLeave.bind(this)} ondragover={this.OnDragOver.bind(this)} ondrop={this.OnDrop.bind(this)} style="min-height: 95vh">
            <DirectoryViewComponent dirPath={this.dirPath} />
        </div>;
    }

    //Private methods
    private ExtractDirPath()
    {
        const dirPath = this.router.state.Get().queryParams.dirPath;
        if(dirPath !== undefined)
            this.dirPath = decodeURIComponent(dirPath);
        else
            this.dirPath = "/";
    }

    private async UploadFiles(files: File[])
    {
        this.loading = true;

        const context = this;
        function OnFinish(success: boolean)
        {
            if(success)
            {
                if(files.length === 1)
                    context.infoMessageManager.ShowMessage(<p>File uploaded successfully. You will see it soon in the explorer...</p>, { type: "success" });
                else
                    context.infoMessageManager.ShowMessage(<p>{files.length} files uploaded successfully. You will see them soon in the explorer...</p>, { type: "success" });
            }
        }
        this.popupManager.OpenModal(<UploadFileModal context={{ type: "newfile", containerId: this.containerId, parentPath: this.dirPath }} files={files} onFinish={OnFinish} />, { className: "fade show d-block" });
        //this.infoMessageManager.ShowMessage(<p>{files.length - okCount} files of {files.length} could not be uploaded successfully.</p>, { type: "danger" });

        this.loading = false;
    }

    //Event handlers
    private OnDragEnter(event: DragEvent)
    {
        dragCounter++;
        const elem = (this.vNode?.domNode as HTMLElement);
        elem.className = "border border-2 border-primary rounded shadow bg-primary-subtle opacity-50";
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

    override OnInitiated(): void
    {
        this.ExtractDirPath();
        this.router.state.Subscribe(this.ExtractDirPath.bind(this));
    }

    //State
    private dirPath: string;
    private loading: boolean;
}