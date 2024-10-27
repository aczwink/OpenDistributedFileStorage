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

import { Anchor, BootstrapIcon, Component, Injectable, JSX_CreateElement, JSX_Fragment, ProgressSpinner, RouteParamProperty } from "acfrontend";
import { APIService } from "../APIService";
import { FileOverviewData } from "../../dist/api";
import { ThumbnailComponent } from "./ThumbnailComponent";

@Injectable
export class DirectoryViewComponent extends Component
{
    constructor(private apiService: APIService, @RouteParamProperty("containerId") private containerId: number)
    {
        super();

        this.containerName = "";
        this.dirPath = "/";
        this.data = null;
    }

    protected Render(): RenderValue
    {
        if(this.data === null)
            return <ProgressSpinner />;
        return <>
            <div className="container">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Anchor route="/"><BootstrapIcon>house</BootstrapIcon></Anchor></li>
                        {this.RenderNav()}
                    </ol>
                </nav>
            </div>
            <div className="row justify-content-center">{this.data.map(this.RenderContents.bind(this))}</div>
        </>;
    }

    //State
    private containerName: string;
    private dirPath: string;
    private data: FileOverviewData[] | null;

    //Private methods
    private async LoadData()
    {
        this.data = null;
        const response = await this.apiService.containers._any_.files.get(this.containerId, { dirPath: this.dirPath });
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.data = response.data;
    }

    private RenderContents(fileData: FileOverviewData)
    {
        return <div className="col-auto">
            <Anchor route={"/" + this.containerId + "/" + fileData.id}>
                <h3 className="text-center"><ThumbnailComponent fileId={fileData.id} mediaType={fileData.mediaType} /></h3>
                {fileData.filePath.substring(this.dirPath.length)}
            </Anchor>
        </div>;
    }

    private RenderNav()
    {
        if(this.dirPath === "/")
            return <li className="breadcrumb-item active">{this.containerName}</li>;
    }

    //Event handlers
    override async OnInitiated(): Promise<void>
    {
        const response = await this.apiService.containers.get();
        this.containerName = response.data.find(x => x.id === this.containerId)!.name;

        this.LoadData();
    }
}