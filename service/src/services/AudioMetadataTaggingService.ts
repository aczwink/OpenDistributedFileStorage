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
import { Injectable } from "acts-util-node";
import { BlobsController } from "../data-access/BlobsController";
import { FFProbe_MediaInfo } from "./FFProbeService";

interface AudioMetadataTags
{
    artist: string;
    comment: string;
    title: string;
}

@Injectable
export class AudioMetadataTaggingService
{
    constructor(private blobsController: BlobsController)
    {
    }

    public async FetchTags(blobId: number)
    {
        const avData = await this.blobsController.QueryMetaData(blobId, "av");
        if(avData === undefined)
            return undefined;
        return this.Map(JSON.parse(avData));
    }

    //Private methods
    private Map(mediaInfo: FFProbe_MediaInfo): AudioMetadataTags
    {
        const t = mediaInfo.format.tags;
        return {
            artist: t.artist ?? "",
            comment: t.comment ?? "",
            title: t.title ?? ""
        };
    }
}