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
import fs from "fs";
import path from "path";
import { Injectable } from "acts-util-node";
import { BlobsController } from "../data-access/BlobsController";
import { FFProbe_MediaInfo } from "./FFProbeService";
import { FilesController } from "../data-access/FilesController";
import { FileDownloadService } from "./FileDownloadService";
import { CommandExecutor } from "./CommandExecutor";
import { FileUploadProcessor } from "./FileUploadProcessor";

export interface AudioMetadataTags
{
    artist: string;
    comment: string;
    title: string;
}

@Injectable
export class AudioMetadataTaggingService
{
    constructor(private blobsController: BlobsController, private filesController: FilesController, private fileDownloadService: FileDownloadService,
        private commandExecutor: CommandExecutor, private fileUploadService: FileUploadProcessor
    )
    {
    }

    //Public methods
    public async CreateRevisionWithNewTags(fileId: number, audioMetadataTags: AudioMetadataTags, userId: string)
    {
        const fileMetaData = await this.filesController.Query(fileId);
        const rev = await this.filesController.QueryNewestRevision(fileId);

        let tmpDir;
        try
        {
            tmpDir = await fs.promises.mkdtemp("/tmp/oos");

            const inputPath = path.join(tmpDir, "__input");
            await this.fileDownloadService.DownloadBlobOntoLocalFileSystem(rev!.blobId, userId, inputPath);

            await this.Process(fileId, inputPath, fileMetaData!.mediaType, audioMetadataTags);
        }
        finally
        {
            if(tmpDir !== undefined)
                await fs.promises.rm(tmpDir, { recursive: true });
        }
    }

    public async FetchTags(blobId: number)
    {
        const avData = await this.blobsController.QueryMetaData(blobId, "av");
        if(avData === undefined)
            return undefined;
        const parsed = JSON.parse(avData) as FFProbe_MediaInfo;
        return this.Map(parsed);
    }

    //Private methods
    private Map(mediaInfo: FFProbe_MediaInfo): AudioMetadataTags | undefined
    {
        const t = mediaInfo.format.tags;
        if(t === undefined)
            return undefined;
        return {
            artist: t.artist ?? "",
            comment: t.comment ?? "",
            title: t.title ?? ""
        };
    }

    private MediaTypeToFileExtension(mediaType: string)
    {
        switch(mediaType)
        {
            case "audio/mp4":
                return "m4a";
        }
        throw new Error("Method not implemented:" + mediaType);
    }

    private async Process(fileId: number, inputPath: string, mediaType: string, tags: AudioMetadataTags)
    {
        function meta(key: keyof AudioMetadataTags)
        {
            return [
                "-metadata", key + '="' + tags[key] + '"'
            ];
        }

        const dirPath = path.dirname(inputPath);
        const targetPath = path.join(dirPath, "__output." + this.MediaTypeToFileExtension(mediaType));

        const metaCommands = [
            meta("artist"),
            meta("comment"),
            meta("title"),
        ];

        const command = [
            "ffmpeg",
            "-i", inputPath,
            ...metaCommands.Values().Map(x => x.Values()).Flatten().ToArray(),
            "-c", "copy",
            targetPath
        ];
        await this.commandExecutor.Execute(command);

        const buffer = await fs.promises.readFile(targetPath);
        await this.fileUploadService.UploadRevision(fileId, buffer);
    }
}