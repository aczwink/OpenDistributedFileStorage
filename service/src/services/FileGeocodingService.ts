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
import { Injectable } from "acts-util-node";
import { FilesController } from "../data-access/FilesController";
import { TagsController } from "../data-access/TagsController";
import { GeocodingService } from "./GeocodingService";
import { ImageMetadataService } from "./ImageMetadataService";

@Injectable
export class FileGeocodingService
{
    constructor(private filesController: FilesController, private tagsController: TagsController, private geocodingService: GeocodingService,
        private imageMetadataService: ImageMetadataService
    )
    {
    }
    
    public async TrySetGeoLocationOnAssociatedFiles(blobId: number)
    {
        const tags = await this.imageMetadataService.FetchTags(blobId);
        if(tags === undefined)
            return;
        const lat = tags.geolocation?.latitude
        const lon = tags.geolocation?.longitude;

        if((lat === undefined) || (lon === undefined))
            return;

        const data = await this.geocodingService.ReverseLookup(lat, lon);
        if(data === null)
            return;

        const fileIds = await this.filesController.QueryFilesAssociatedWithBlob(blobId);
        for (const fileId of fileIds)
        {
            const row = await this.tagsController.QueryFileLocation(fileId);
            if(row === undefined)
            {
                await this.tagsController.UpdateFileLocation(fileId, {
                    countryCode: data.address.country_code.toUpperCase(),
                    lat,
                    lon,
                    osmId: null
                });
            }
        }
    }
}