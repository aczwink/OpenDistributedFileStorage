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

import { BootstrapIcon, Component, Injectable, JSX_CreateElement, PopupManager } from "acfrontend";
import { APIService } from "../APIService";

@Injectable
export class ThumbnailComponent extends Component<{ fileId: number; mediaType: string; }>
{
    constructor(private apiService: APIService, private popupManager: PopupManager)
    {
        super();

        this.thumb = null;
        this.tile = null;
        this.preview = null;
        this.showPreview = false;
    }

    protected Render(): RenderValue
    {
        function OnPlay(event: Event)
        {
            const elem = event.target as HTMLVideoElement;
            elem.defaultPlaybackRate = 1.25;
            elem.playbackRate = 1.25;
        }

        const mediaType = this.input.mediaType;

        const sizeStyle = "max-width: 256px; max-height: 128px;";
        const style = sizeStyle + " cursor: zoom-in;";
        if(this.showPreview)
        {
            return <div onmouseleave={() => this.showPreview = false} onclick={this.ShowTile.bind(this)}>
                <video autoplay={true} loop={true} controls={false} muted={true} onplay={OnPlay} style={style}>
                    <source src={this.preview!} type="video/mp4" />
                </video>
            </div>;
        }

        if(this.thumb !== null)
        {
            if(this.tile !== null)
            {
                if(this.preview !== null)
                {
                    return <img src={this.thumb} style={style} onclick={this.ShowTile.bind(this)} onmouseenter={() => this.showPreview = true} />;
                }
                return <img src={this.thumb} style={style} onclick={this.ShowTile.bind(this)} />
            }
            return <img src={this.thumb} style={sizeStyle} />;
        }

        if(mediaType.startsWith("video/"))
            return <BootstrapIcon>film</BootstrapIcon>;
    
        switch(mediaType)
        {
            case "application/x-javascript":
                return <BootstrapIcon>filetype-js</BootstrapIcon>;
            case "audio/mp4":
                return <BootstrapIcon>filetype-aac</BootstrapIcon>;
            case "text/plain":
                return <BootstrapIcon>filetype-txt</BootstrapIcon>;
            default:
                return <BootstrapIcon>file</BootstrapIcon>;
        }
    }

    //Private methods
    private async LoadData()
    {
        let versions;
        if(this.input.mediaType.startsWith("image/") || this.input.mediaType.startsWith("video/"))
        {
            const response = await this.apiService.files._any_.versions.get(this.input.fileId);
            if(response.statusCode !== 200)
                throw new Error("TODO: implement me");

            versions = response.data;
            const thumbs = versions.Values().Filter(x => x.title.startsWith("thumb_")).Map(x => {
                return {
                    version: x,
                    t: parseInt(x.title.substring("thumb_".length))
                };
            }).Filter(x => !isNaN(x.t)).OrderBy(x => x.t).Map(x => x.version).ToArray();

            if(versions.length > 0)
            {
                const thumbIndex = Math.floor(thumbs.length / 2);

                const response2 = await this.apiService.files._any_.versions.blob.get(this.input.fileId, { blobId: thumbs[thumbIndex].blobId });
                if(response2.statusCode !== 200)
                    throw new Error("TODO: implement me");
                this.thumb = await this.ReadBlob(response2.data, "image/jpg");
            }
        }

        if(this.input.mediaType.startsWith("video/"))
        {
            const tile = versions?.find(x => x.title === "thumb_tiles");
            if(tile !== undefined)
            {
                const response = await this.apiService.files._any_.versions.blob.get(this.input.fileId, { blobId: tile.blobId });
                if(response.statusCode !== 200)
                    throw new Error("TODO: implement me");
                this.tile = await this.ReadBlob(response.data, "image/jpg");
            }

            const preview = versions?.find(x => x.title === "preview");
            if(preview !== undefined)
            {
                const response = await this.apiService.files._any_.versions.blob.get(this.input.fileId, { blobId: preview.blobId });
                if(response.statusCode !== 200)
                    throw new Error("TODO: implement me");
                this.preview = await this.ReadBlob(response.data, "video/mp4");
            }
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

    private ShowTile(event: Event)
    {
        event.preventDefault();
        event.stopPropagation();
        this.popupManager.OpenModal(<img src={this.tile!} />, { className: "fade show d-block text-center" });
    }

    //Event handlers
    override OnInitiated(): void
    {
        this.LoadData();
    }

    //State
    private thumb: string | null;
    private tile: string | null;
    private preview: string | null;
    private showPreview: boolean;
}