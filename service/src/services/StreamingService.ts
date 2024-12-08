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
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Injectable } from "acts-util-node";
import { Dictionary } from "acts-util-core";
import { AccessCounterService } from "./AccessCounterService";

interface StreamingInfo
{
    allowedBlobIds: Set<number>;
    expireAt: number;
    partiallyAccessedBlobIds: Set<number>;
    remoteIP: string;
    userId: string;
}

@Injectable
export class StreamingService
{
    constructor(private accessCounterService: AccessCounterService)
    {
        this.streamingKeys = {};
        this.userIdToStreamingKey = {};
    }

    //Public methods
    public Authenticate(streamingKey: string, blobId: number, remoteIP: string)
    {
        const info = this.streamingKeys[streamingKey];
        if(info === undefined)
            return null;
        if((Date.now() / 1000) > info.expireAt)
        {
            delete this.streamingKeys[streamingKey];
            return null;
        }
        if(!info.allowedBlobIds.has(blobId))
            return null;
        if(info.remoteIP !== remoteIP)
            return null;

        return info.userId;
    }

    public CreateStreamingKey(userId: string, accessTokenExpiry: number, ip: string, blobIds: number[])
    {
        this.InvalidateUserStreamingKeys(userId);

        const streamingKey = crypto.randomUUID();
        this.streamingKeys[streamingKey] = {
            allowedBlobIds: new Set(blobIds),
            expireAt: accessTokenExpiry,
            partiallyAccessedBlobIds: new Set(),
            remoteIP: ip,
            userId
        };
        this.userIdToStreamingKey[userId] = streamingKey;

        return streamingKey as string;
    }

    public InformAboutPartialAccess(streamingKey: string, blobId: number, userId: string)
    {
        const info = this.streamingKeys[streamingKey];
        const set = info!.partiallyAccessedBlobIds;

        if(!set.has(blobId))
        {
            this.accessCounterService.AddBlobAccess(userId, blobId);
            set.add(blobId);
        }
    }

    public Invalidate(authorizationHeader: string)
    {
        const at = authorizationHeader.substring("Bearer ".length);
        const decoded = jwt.decode(at, { json: true });
        this.InvalidateUserStreamingKeys(decoded!.sub!);
    }

    //Private methods
    private InvalidateUserStreamingKeys(userId: string)
    {
        const oldKey = this.userIdToStreamingKey[userId];
        if(oldKey !== undefined)
        {
            delete this.streamingKeys[oldKey];
            delete this.userIdToStreamingKey[userId];
        }
    }

    //State
    private streamingKeys: Dictionary<StreamingInfo>;
    private userIdToStreamingKey: Dictionary<string>;
}