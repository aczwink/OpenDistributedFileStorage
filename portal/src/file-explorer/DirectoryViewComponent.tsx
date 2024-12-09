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

import { Anchor, AutoCompleteMultiSelectBox, BootstrapIcon, Component, FormField, Injectable, JSX_CreateElement, JSX_Fragment, LineEdit, ProgressSpinner, RouteParamProperty } from "acfrontend";
import { APIService } from "../APIService";
import { DirectoryContentsDTO } from "../../dist/api";
import { FilesGridView } from "./FilesGridView";
import { FilesTableView } from "./FilesTableView";

@Injectable
export class DirectoryViewComponent extends Component<{ dirPath: string }>
{
    constructor(private apiService: APIService, @RouteParamProperty("containerId") private containerId: number)
    {
        super();

        this.containerName = "";
        this.data = null;
        this.view = "grid";
        this.showSearch = false;
        this.searchFilterName = "";
        this.searchFilterMediaType = "";
        this.searchTags = [];
    }

    protected Render(): RenderValue
    {
        return <>
            <div className="container">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Anchor route="/"><BootstrapIcon>house</BootstrapIcon></Anchor></li>
                        {this.RenderNav()}
                        <li className="ms-auto">
                            <a role="button" className={this.GetToggleButtonClassName(this.showSearch)} onclick={this.OnToggleSearch.bind(this)}><BootstrapIcon>search</BootstrapIcon></a>
                            <br />
                            <button type="button" className={this.GetToggleButtonClassName(this.view === "grid")} onclick={() => this.view = "grid"}><BootstrapIcon>grid</BootstrapIcon></button>
                            <button type="button" className={this.GetToggleButtonClassName(this.view === "list")} onclick={() => this.view = "list"}><BootstrapIcon>view-list</BootstrapIcon></button>
                        </li>
                    </ol>
                </nav>
            </div>
            {this.RenderSearchForm()}
            {this.RenderContent()}
        </>;
    }

    //Private methods
    private GetToggleButtonClassName(condition: boolean)
    {
        const className = condition ? "btn-primary btn-active" : "text-primary";
        return "btn btn-sm " + className;
    }

    private async LoadData()
    {
        this.data = null;
        const response = await this.apiService.containers._any_.files.get(this.containerId, { dirPath: this.input.dirPath });
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.data = response.data;
    }

    private RenderContent()
    {
        if(this.data === null)
            return <ProgressSpinner />;

        if(this.view === "grid")
            return <FilesGridView containerId={this.containerId} contents={this.data} parentPath={this.input.dirPath} />;
        return <FilesTableView containerId={this.containerId} contents={this.data} parentPath={this.input.dirPath} />;
    }

    private RenderNav()
    {
        function JoinDir(idx: number)
        {
            return "/" + dirs.slice(0, idx + 1).join("/");
        }

        if(this.input.dirPath === "/")
            return <li className="breadcrumb-item active">{this.containerName}</li>;
        const dirs = this.input.dirPath.substring(1).split("/");
        const last = dirs.pop();
        return <>
            <li className="breadcrumb-item"><Anchor route={"/" + this.containerId}>{this.containerName}</Anchor></li>
            {dirs.map((x, i) => <li className="breadcrumb-item"><Anchor route={"/" + this.containerId + "?dirPath=" + JoinDir(i)}>{x}</Anchor></li>)}
            <li className="breadcrumb-item active">{last}</li>
        </>;
    }

    private RenderSearchForm()
    {
        const mapped = this.searchTags.map(x => ({ key: x, displayValue: x }));

        if(!this.showSearch)
            return null;

        return <div className="container shadow my-4 mx-auto card">
            <div className="card-body">
                <form onsubmit={this.OnSearch.bind(this)}>
                    <div className="row">
                        <div className="col">
                            <FormField title="Name">
                                <LineEdit value={this.searchFilterName} onChanged={newValue => this.searchFilterName = newValue} />
                            </FormField>
                        </div>
                        <div className="col">
                            <FormField title="Media type">
                                <LineEdit value={this.searchFilterMediaType} onChanged={newValue => this.searchFilterMediaType = newValue} />
                            </FormField>
                        </div>
                        <div className="col">
                            <FormField title="Tags">
                                <AutoCompleteMultiSelectBox selection={mapped} onChanged={kvs => this.searchTags = kvs.map(x => x.key)} onLoadSuggestions={this.OnLoadTags.bind(this)} />
                            </FormField>
                        </div>
                        <div className="col-auto">
                            <button className="btn btn-primary" type="submit">Search</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>;
    }

    //Event handlers
    override async OnInitiated(): Promise<void>
    {
        const response = await this.apiService.containers.get();
        this.containerName = response.data.find(x => x.id === this.containerId)!.name;

        this.LoadData();
    }

    override OnInputChanged(): void
    {
        this.LoadData();
    }

    private async OnLoadTags(searchText: string)
    {
        const response = await this.apiService.tags.get({ containerId: this.containerId, substring: searchText });
        return response.data.map(x => ({
            key: x,
            displayValue: x
        }));
    }

    private async OnSearch(event: Event)
    {
        event.preventDefault();

        this.data = null;
        const response = await this.apiService.containers._any_.search.get(this.containerId, {
            dirPath: this.input.dirPath,
            nameFilter: this.searchFilterName,
            mediaTypeFilter: this.searchFilterMediaType,
            requiredTags: this.searchTags.join(",")
        });
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.data = { dirs: [], files: response.data };
    }

    private OnToggleSearch()
    {
        if(this.showSearch)
            this.LoadData();
        else
            this.data = { dirs: [], files: [] };
        this.showSearch = !this.showSearch;
    }

    //State
    private containerName: string;
    private data: DirectoryContentsDTO | null;
    private view: "grid" | "list";
    private showSearch: boolean;
    private searchFilterName: string;
    private searchFilterMediaType: string;
    private searchTags: string[];
}