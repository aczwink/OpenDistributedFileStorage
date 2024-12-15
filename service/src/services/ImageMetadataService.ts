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
import { CommandExecutor } from "./CommandExecutor";
import { BlobsController } from "../data-access/BlobsController";

interface ExifToolTags
{
    GPSDateTime?: string;
    GPSLatitude?: string;
    GPSLongitude?: string;
}

interface ImageTags
{
    geolocation?: {
        dateTime: string;
        latitude: string;
        longitude: string;
    }
}

@Injectable
export class ImageMetadataService
{
    constructor(private commandExecutor: CommandExecutor, private blobsController: BlobsController)
    {
    }

    //Public methods
    public async ExtractTags(mediaFilePath: string)
    {
        const result = await this.commandExecutor.Execute(["exiftool", "-json", "-c", "%.6f", mediaFilePath]);

        return JSON.parse(result.stdOut) as ExifToolTags[];
    }

    public async FetchTags(blobId: number)
    {
        const imgData = await this.blobsController.QueryMetaData(blobId, "img");
        if(imgData === undefined)
            return undefined;
        const parsed = JSON.parse(imgData) as ExifToolTags[];
        return this.Map(parsed[0]);
    }

    //Private methods
    private Map(exif: ExifToolTags): ImageTags
    {
        if((exif.GPSDateTime !== undefined) && (exif.GPSLatitude !== undefined) && (exif.GPSLongitude !== undefined))
        {
            return {
                geolocation: {
                    dateTime: exif.GPSDateTime,
                    latitude: exif.GPSLatitude,
                    longitude: exif.GPSLongitude
                }
            };
        }
        return {};
    }
}