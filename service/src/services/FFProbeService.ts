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

interface FFProbe_CommonStreamInfo
{
    codec_name: string;
    profile?: string;
}

interface FFProbe_AudioStreamInfo extends FFProbe_CommonStreamInfo
{
    codec_type: "audio";
}

interface FFProbe_VideoStreamInfo extends FFProbe_CommonStreamInfo
{
    codec_type: "video";
    height: number;
    r_frame_rate: string;
    width: number;
}

type FFProbe_StreamInfo = FFProbe_AudioStreamInfo | FFProbe_VideoStreamInfo;

export interface FFProbe_MediaInfo
{
    format: {
        duration: string;
        tags: {
            artist?: string;
            comment?: string;
            title?: string;
        };
    };
    streams: FFProbe_StreamInfo[];
}

@Injectable
export class FFProbeService
{
    constructor(private commandExecutor: CommandExecutor)
    {
    }

    //Public methods
    public async AnalyzeMediaFile(mediaFilePath: string)
    {
        const result = await this.commandExecutor.Execute(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", mediaFilePath]);

        return JSON.parse(result.stdOut) as FFProbe_MediaInfo;
    }

    public ExtractVideoStream(mediaInfo: FFProbe_MediaInfo)
    {
        const streams = mediaInfo.streams.filter(x => x.codec_type === "video");
        if(streams.length != 1)
            throw new Error("TODO: implement me");
        
        return streams[0] as FFProbe_VideoStreamInfo;
    }

    public IsStreamable(mediaType: string, mediaInfo: FFProbe_MediaInfo)
    {
        const streamTypes = mediaInfo.streams.Values().Map(x => x.codec_type).Distinct(x => x);
        return (mediaType === "video/mp4") && streamTypes.Map(x => this.IsAnyStreamStreamable(x, mediaInfo)).All();
    }

    //Private methods
    private IsAnyStreamStreamable(type: "audio" | "video", mediaInfo: FFProbe_MediaInfo)
    {
        return mediaInfo.streams.Values().Filter(x => x.codec_type === type).Map(x => this.IsStreamStreamable(x)).AnyTrue();
    }

    private IsStreamStreamable(stream: FFProbe_StreamInfo)
    {
        switch(stream.codec_type)
        {
            case "audio":
                return stream.codec_name === "mp3";
            case "video":
                return stream.codec_name === "h264";
        }
    }
}