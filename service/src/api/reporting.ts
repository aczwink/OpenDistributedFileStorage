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

import { APIController, Get, Security } from "acts-util-apilib";
import { OIDC_API_SCHEME, SCOPE_ADMIN } from "../api_security";
import { ReportingController } from "../data-access/ReportingController";
import { Of } from "acts-util-core";
import { BlobsController } from "../data-access/BlobsController";

interface LargeBlobReportEntry
{
    blobId: number;
    filePath: string;
    fileSize: number;
    storedSize: number;
}

@APIController("reporting")
@Security(OIDC_API_SCHEME, [SCOPE_ADMIN])
class _api_
{
    constructor(private reportingController: ReportingController, private blobsController: BlobsController)
    {
    }
    
    @Get("largeblobs")
    public async RequestLargeBlobs()
    {
        const result = await this.reportingController.FindLargeBlobs();
        return await result.Map(async x => Of<LargeBlobReportEntry>({
            blobId: x.blobId,
            filePath: await this.reportingController.FindSomeFileAssociation(x.blobId),
            fileSize: x.size,
            storedSize: (await this.blobsController.QueryBlobStoredSize(x.blobId))!,
        })).PromiseAll();
    }
}