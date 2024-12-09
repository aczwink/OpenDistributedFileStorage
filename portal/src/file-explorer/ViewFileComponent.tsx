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

import { Injectable, Component, RouteParamProperty, ProgressSpinner, JSX_CreateElement, JSX_Fragment, BootstrapIcon, Anchor, FileDownloadService, NavItem, RouterComponent, InfoMessageManager } from "acfrontend";
import { APIService } from "../APIService";
import { FileMetaDataDTO } from "../../dist/api";
import { FileEventsService } from "../FileEventsService";
import { Subscription } from "acts-util-core";

let dragCounter = 0;

@Injectable
export class ViewFileComponent extends Component
{
    constructor(private apiService: APIService, private fileDownloadService: FileDownloadService, private infoMessageManager: InfoMessageManager,
        @RouteParamProperty("containerId") private containerId: number,
        @RouteParamProperty("fileId") private fileId: number,
        private fileEventsService: FileEventsService
    )
    {
        super();

        this.data = null;
        this.containerName = "Container";
    }
    
    protected Render(): RenderValue
    {
        if(this.data === null)
            return <ProgressSpinner />;

        if(this.apiService.readOnly)
            return this.RenderPage();
        return <div ondragenter={this.OnDragEnter.bind(this)} ondragleave={this.OnDragLeave.bind(this)} ondragover={this.OnDragOver.bind(this)} ondrop={this.OnDrop.bind(this)} style="min-height: 95vh">
            {this.RenderPage()}
        </div>;
    }

    //Private methods
    private GetFileName()
    {
        return this.data!.filePath.substring(this.data!.filePath.lastIndexOf('/') + 1);
    }

    private async LoadData()
    {
        this.data = null;
        const response = await this.apiService.files._any_.get(this.fileId);
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.data = response.data;
    }

    private RenderPage()
    {
        return <>
            <div className="container">{this.RenderNavbar()}</div>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-auto">
                        {this.RenderSubNav()}
                    </div>
                    <div className="col">
                        <RouterComponent />
                    </div>
                </div>
            </div>
        </>;
    }

    private RenderSubNav()
    {
        return <ul className="nav nav-pills flex-column">
            <NavItem route={"/" + this.containerId + "/" + this.fileId + "/content"}><BootstrapIcon>eyeglasses</BootstrapIcon> View</NavItem>
            {this.data?.mediaType.startsWith("audio/") ? <NavItem route={"/" + this.containerId + "/" + this.fileId + "/metadata"}><BootstrapIcon>info-circle</BootstrapIcon> Song info</NavItem> : null}
            <NavItem route={"/" + this.containerId + "/" + this.fileId + "/accesses"}><BootstrapIcon>graph-up</BootstrapIcon> Access statistics</NavItem>
            <NavItem route={"/" + this.containerId + "/" + this.fileId + "/revisions"}><BootstrapIcon>card-list</BootstrapIcon> Revisions</NavItem>
            <NavItem route={"/" + this.containerId + "/" + this.fileId + "/versions"}><BootstrapIcon>clock-history</BootstrapIcon> Versions</NavItem>
        </ul>;
    }

    private RenderNav()
    {
        function JoinDir(idx: number)
        {
            return "/" + parts.slice(0, idx + 1).join("/");
        }

        const parts = this.data!.filePath.substring(1).split("/");
        parts.pop(); //remove file

        if(parts.length === 0)
            return <li className="breadcrumb-item"><Anchor route={"/" + this.containerId}>{this.containerName}</Anchor></li>;
        return <>
            <li className="breadcrumb-item"><Anchor route={"/" + this.containerId}>{this.containerName}</Anchor></li>
            {parts.map((x, i) => <li className="breadcrumb-item"><Anchor route={"/" + this.containerId + "?dirPath=" + JoinDir(i)}>{x}</Anchor></li>)}
        </>;
    }

    private RenderNavbar()
    {
        return <div className="row">
            <div className="col-auto">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Anchor route="/"><BootstrapIcon>house</BootstrapIcon></Anchor></li>
                        {this.RenderNav()}
                        <li className="breadcrumb-item active">{this.GetFileName()}</li>
                    </ol>
                </nav>
            </div>
            <div className="col-auto">
                {this.data!.tags.map(t => <span className="badge rounded-pill text-bg-primary">{t}</span>)}
            </div>
            <div className="col-auto">
                <a className="text-primary px-1" role="button" onclick={this.OnDownloadFile.bind(this)}><BootstrapIcon>download</BootstrapIcon></a>
                {this.apiService.readOnly ? null : <Anchor className="px-1" route={"/" + this.containerId + "/" + this.fileId + "/edit"}><BootstrapIcon>pencil</BootstrapIcon></Anchor>}
            </div>
        </div>;
    }

    private async UploadFiles(files: File[])
    {
        if(files.length !== 1)
        {
            this.infoMessageManager.ShowMessage(<p>To upload a revision you need to drop exactly one file.</p>, { type: "warning" });
            return;
        }

        const response = await this.apiService.files._any_.revisions.post(this.fileId, { file: files[0] });
        switch(response.statusCode)
        {
            case 204:
                this.infoMessageManager.ShowMessage(<p>New revision uploaded successfully.</p>, { type: "success" });
                this.LoadData();
                break;
            default:
                this.infoMessageManager.ShowMessage(<p>An error occured while uploading the new revision.</p>, { type: "danger" });
        }

    }

    //Event handlers
    private async OnDownloadFile()
    {
        const response = await this.apiService.files._any_.blob.get(this.fileId);
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.fileDownloadService.DownloadBlobAsFile(response.data, this.GetFileName());
    }

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

    override async OnInitiated(): Promise<void>
    {
        const response = await this.apiService.containers._any_.get(this.containerId);
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.containerName = response.data.name;
        this.LoadData();

        this.subscription = this.fileEventsService.onChanged.Subscribe({
            next: () => this.LoadData()
        });
    }

    override OnUnmounted(): void
    {
        this.subscription?.Unsubscribe();
    }

    //State
    private data: FileMetaDataDTO | null;
    private containerName: string;
    private subscription?: Subscription;
}