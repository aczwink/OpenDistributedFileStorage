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
import fs from "fs";
import path from "path";
import { Injectable } from "acts-util-node";
import { FileDownloadService } from "./FileDownloadService";
import { FilesController } from "../data-access/FilesController";
import { CommandExecutor } from "./CommandExecutor";
import { FileUploadService } from "./FileUploadService";
import { FileVersionsController } from "../data-access/FileVersionsController";
import { FFProbe_MediaInfo, FFProbeService } from "./FFProbeService";
import { BlobsController } from "../data-access/BlobsController";

@Injectable
export class ThumbnailService
{
    constructor(private filesController: FilesController, private fileDownloadService: FileDownloadService, private commandExecutor: CommandExecutor,
        private fileUploadService: FileUploadService, private fileVersionsController: FileVersionsController, private ffProbeService: FFProbeService,
        private blobsController: BlobsController,
    )
    {
    }

    public async Compute(fileId: number)
    {
        const fileMetaData = await this.filesController.Query(fileId);
        const rev = await this.filesController.QueryNewestRevision(fileId);

        let tmpDir;
        try
        {
            tmpDir = await fs.promises.mkdtemp("/tmp/oos");

            const blob = await this.fileDownloadService.DownloadBlob(rev!.blobId);
            const inputPath = path.join(tmpDir, "__input");
            await fs.promises.writeFile(inputPath, blob);

            await this.Process(fileId, rev!.blobId, inputPath, fileMetaData!.mediaType);
        }
        finally
        {
            if(tmpDir !== undefined)
                await fs.promises.rm(tmpDir, { recursive: true });
        }
    }

    private async Process(fileId: number, blobId: number, mediaFilePath: string, mediaType: string)
    {
        const mediaInfo = await this.ffProbeService.AnalyzeMediaFile(mediaFilePath);
        await this.blobsController.WriteMetaData(blobId, "av", JSON.stringify(mediaInfo));

        if(!mediaType.startsWith("audio/"))
        {
            const isImage = mediaType.startsWith("image/");

            const thumbPaths = isImage ? await this.ComputeImageThumb(mediaFilePath, mediaInfo) : await this.ComputeVideoThumbs(mediaFilePath, mediaInfo);
            for (const thumbPath of thumbPaths)
            {
                const buffer = await fs.promises.readFile(thumbPath);
                const blobId = await this.fileUploadService.UploadBlob(buffer);

                const parsed = path.parse(thumbPath);
                await this.fileVersionsController.AddVersion(fileId, blobId, parsed.name);
            }
        }
    }

    //Private methods
    private async ComputeImageThumb(inputPath: string, mediaInfo: FFProbe_MediaInfo)
    {
        const vidStream = this.ffProbeService.ExtractVideoStream(mediaInfo);
        const isWidthBigger = vidStream.width > vidStream.height;
        const scale = isWidthBigger ? "256:-1" : "-1:256";

        return await this.CreateImageThumbnail(inputPath, scale);
    }

    private async ComputeVideoPreview(inputPath: string, duration: number, scale: string)
    {
        const segmentsPath = path.dirname(inputPath);

        const segmentsCount = 5;
        const segmentLength = 4;
        const partitionLength = duration / segmentsCount;

        const h264baselineArgs = [
            "-vcodec", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "baseline",
            "-level", "3",
            "-preset", "medium",
        ];

        for(let i = 0; i < segmentsCount; i++)
        {
            const partitionBegin = i * partitionLength;
            const partitionMiddle = partitionBegin + partitionLength / 2;

            const startSeek = partitionMiddle - (segmentLength / 2);

            const segmentPath = path.join(segmentsPath, i + ".mkv");
            await this.commandExecutor.Execute(
                [
                    "ffmpeg",
                    "-ss", startSeek.toString(),
                    "-t", segmentLength.toString(),
                    "-i", inputPath,
                    ...h264baselineArgs,
                    segmentPath
                ]
            );
        }

        const concatPath = path.join(segmentsPath, "concatlist.txt");
        let lines = [];
        for(let i = 0; i < segmentsCount; i++)
        {
            const segmentPath = path.join(segmentsPath, i + ".mkv");
            lines.push("file " + segmentPath);
        }
        await fs.promises.writeFile(concatPath, lines.join("\n"), "utf-8");

        const outPath = path.join(segmentsPath, "preview.mp4");
        await this.commandExecutor.Execute(
            [
                "ffmpeg",
                "-f", "concat",
                "-safe", "0",
                "-i", concatPath,

                "-vf", '"' + "scale=" + scale + ",pad=ceil(iw/2)*2:ceil(ih/2)*2" + '"',
                ...h264baselineArgs,
                outPath
            ]
        );

        return outPath;
    }

    private async ComputeVideoThumbs(mediaFilePath: string, mediaInfo: FFProbe_MediaInfo)
    {
        const vidStream = this.ffProbeService.ExtractVideoStream(mediaInfo);

        const segmentsCount = 3*3;
        const duration = parseFloat(mediaInfo.format.duration);
        const segments = this.SplitIntoSegmentsByCount(duration, segmentsCount);

        const isWidthBigger = vidStream.width > vidStream.height;
        const scale = isWidthBigger ? "256:-1" : "-1:256";

        const imgThumbPaths = [];
        for (const segment of segments)
        {
            const thumbPath = await this.CreateImageThumbnail(mediaFilePath, scale, segment);
            imgThumbPaths.push(thumbPath);
        }

        const dirPath = path.dirname(mediaFilePath);
        const patternPath = path.join(dirPath, "*.jpg");
        const tilesPath = path.join(dirPath, "thumb_tiles.jpg");
        await this.commandExecutor.Execute(["ffmpeg", "-pattern_type", "glob", "-i", "'" + patternPath + "'", "-filter_complex", "tile=3x3", tilesPath]);

        const previewPath = await this.ComputeVideoPreview(mediaFilePath, duration, scale);

        return [
            ...imgThumbPaths,
            tilesPath,
            previewPath
        ];
    }

    private async CreateImageThumbnail(inputPath: string, scale: string, seekTo?: number)
    {
        const dirPath = path.dirname(inputPath);
        const outPath = path.join(dirPath, (seekTo === undefined) ? "thumb.jpg" : ("thumb_" + Math.round(seekTo) + ".jpg"));
        const seekParams = (seekTo === undefined) ? [] : [ "-ss", seekTo.toString()];
        await this.commandExecutor.Execute(["ffmpeg", ...seekParams, "-i", inputPath, "-vf", "scale=" + scale, "-frames:v", "1", outPath]);

        return outPath;
    }

    private SplitIntoSegmentsByCount(duration: number, segmentsCount: number)
    {
        const segmentLength = duration / segmentsCount;

        const segments = [];
        for(let i = 0; i < segmentsCount; i++)
        {
            const begin = i * segmentLength;
            //const end = begin + segmentLength;
            const middle = begin + (segmentLength / 2);

            segments.push(middle);
        }

        return segments;
    }
}