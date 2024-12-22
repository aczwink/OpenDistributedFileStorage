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

import { Component, FormField, Injectable, JSX_CreateElement, JSX_Fragment, ProgressSpinner, RouteParamProperty, Select } from "acfrontend";
import { StreamingRequestResultDTO } from "../../../dist/api";
import { CONFIG_BACKEND } from "../../config";
import { APIService } from "../../services/APIService";

@Injectable
export class VideoStreamComponent extends Component
{
    constructor(private apiService: APIService, @RouteParamProperty("fileId") private fileId: number)
    {
        super();

        this.data = null;
        this.tile = null;
        this.selectedIndex = 0;
    }

    protected Render(): RenderValue
    {
        if(this.data === null)
            return <ProgressSpinner />;
        if(this.data.options.length === 0)
            return "This video can't be viewed!";

        const sel = this.data.options[this.selectedIndex];
        return <>
            <video controls poster={this.tile!} style="max-width: 90%; max-height: 80vh;">
                <source src={this.GetSelectedVideoURL()} type={sel.mediaType} />
            </video>
            <FormField title="Quality">
                <Select onChanged={this.OnQualityChanged.bind(this)}>
                    {this.data.options.map( (x, i) => <option selected={i === this.selectedIndex}>{x.quality}</option>)}
                </Select>
            </FormField>
        </>;
    }

    //Private methods
    private GetSelectedVideoURL()
    {
        const sel = this.data!.options[this.selectedIndex];
        return `${CONFIG_BACKEND.protocol}://${CONFIG_BACKEND.host}:${CONFIG_BACKEND.port}/stream?blobId=${sel.blobId}&streamingKey=${this.data!.streamingKey}`;
    }

    private async LoadPoster()
    {
        const response = await this.apiService.files._any_.versions.get(this.fileId);
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");

        const tile = response.data.find(x => x.title === "thumb_tiles");
        if(tile !== undefined)
        {
            const response2 = await this.apiService.files._any_.versions.blob.get(this.fileId, { blobId: tile.versionBlobId });
            if(response2.statusCode !== 200)
                throw new Error("TODO: implement me");
            this.tile = await this.ReadBlob(response2.data, "image/jpg");
        }
    }

    private ReadBlob(blob: Blob, targetMediaType: string)
    {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        return new Promise<string>(resolve => {
            reader.onloadend = () => resolve(this.RenderDataAs(reader.result, targetMediaType));
        });
    }

    private RenderDataAs(base64: string | ArrayBuffer | null, mime: string)
    {
        const data = base64 as string;
        const prefix = "data:text/xml";

        return "data:" + mime + data.substring(prefix.length);
    }

    //Event handlers
    override async OnInitiated(): Promise<void>
    {
        await this.LoadPoster();

        const response = await this.apiService.files._any_.stream.post(this.fileId);
        if(response.statusCode !== 200)
            throw new Error("TODO: implement me");
        this.data = response.data;
    }

    private OnQualityChanged(newValue: string[])
    {
        this.selectedIndex = this.data!.options.findIndex(x => x.quality === newValue[0]);
        
        const video = document.getElementsByTagName("video")[0] as HTMLVideoElement;
        
        const isPlaying = !video.paused;
        const pos = video.currentTime;

        video.setAttribute("src", this.GetSelectedVideoURL());
        video.load();

        if(isPlaying)
        {
            video.currentTime = pos;
            video.play();
        }
    }

    //State
    private data: StreamingRequestResultDTO | null;
    private tile: string | null;
    private selectedIndex: number;
}