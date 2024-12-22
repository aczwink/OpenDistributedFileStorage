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

interface CollectGarbageJob
{
    type: "collect-garbage";
}

export type StreamingVersionType = "360p" | "480p";
interface ComputeStreamingVersion
{
    type: "compute-streaming-version";
    blobId: number;
    targetType: StreamingVersionType;
}

interface ComputeThumbs
{
    type: "compute-thumbs";
    blobId: number;
    mediaType: string;
}

interface FileUploadJob
{
    type: "upload-file";
    containerId: number;
    containerPath: string;
    fileId?: number;
    mediaType: string;
    uploadPath: string;
}

interface ReplicationJob
{
    type: "replicate";
    storageBlockId: number;
}

export type BackgroundJob = CollectGarbageJob | ComputeStreamingVersion | ComputeThumbs | FileUploadJob | ReplicationJob;