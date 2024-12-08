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
import path from "path";
import { GlobalInjector } from 'acts-util-node';
import { FileSystem } from 'ftp-srv';
import { ContainersController } from './data-access/ContainersController';
import { FileOverviewData, FilesController } from "./data-access/FilesController";
import { BlobsController } from "./data-access/BlobsController";
import { FileDownloadService } from "./services/FileDownloadService";
import { Readable } from "stream";

const containersController = GlobalInjector.Resolve(ContainersController);
const blobsController = GlobalInjector.Resolve(BlobsController);
const filesController = GlobalInjector.Resolve(FilesController);

export class FTPFileSystem extends FileSystem
{
    //Public methods
    public override async chdir(relativePath?: string): Promise<string>
    {
        (this as any).cwd = relativePath;
        return this.cwd;
    }

    public override async get(fileName: string): Promise<any>
    {
        const absPath = path.join(this.cwd, fileName);
        if(absPath === "/")
        {
            return {
                isDirectory: function ()
                {
                    return true;
                }
            };
        }
        const split = this.SplitPath(absPath);
        if(split.pathInContainer === "/")
            return this.ContainerStats(split.containerName);

        const containerId = await containersController.FindIdByName(split.containerName);
        const fileId = await filesController.FindIdByName(containerId!, split.pathInContainer);
        const file = await filesController.Query(fileId!);

        return this.FileStats(file!);
    }

    public override async list(relativePath?: string): Promise<any>
    {
        const containersController = GlobalInjector.Resolve(ContainersController);
        const containers = await containersController.QueryAll();

        const absPath = path.join(this.cwd, relativePath ?? ".");

        if(absPath === "/")
            return containers.map(x => this.ContainerStats(x.name));

        const split = this.SplitPath(absPath);
        const container = containers.find(x => x.name === split.containerName);

        const filesController = GlobalInjector.Resolve(FilesController);

        const children = await filesController.QueryDirectChildrenOf(container!.id, split.pathInContainer);

        return children.Values().Map(x => this.FileStats(x)).PromiseAll();
    }

    public override async read(fileName: string, options: { start?: any; }): Promise<any>
    {
        const split = this.SplitPath(fileName);

        const containerId = await containersController.FindIdByName(split.containerName);
        const fileId = await filesController.FindIdByName(containerId!, split.pathInContainer);
        const rev = await filesController.QueryNewestRevision(fileId!);

        const fileDownloadService = GlobalInjector.Resolve(FileDownloadService);

        let buffer;
        if(options.start !== undefined)
        {
            const size = await blobsController.QueryBlobSize(rev!.blobId);
            buffer = await fileDownloadService.DownloadBlobSlice(rev!.blobId, options.start, size! - options.start);
        }
        else
        {
            throw new Error("TODO: reimplement me");
            //buffer = await fileDownloadService.DownloadBlob(rev!.blobId);
        }

        return Readable.from(buffer);
    }

    //Private methods
    private ContainerStats(name: string)
    {
        return {
            name,
            mtime: new Date(0),

            isDirectory: function ()
            {
                return true;
            }
        };
    }

    private async FileStats(x: FileOverviewData)
    {
        const rev = await filesController.QueryNewestRevision(x.id);

        return {
            name: path.basename(x.filePath),
            mtime: new Date(rev!.creationTimestamp.millisecondsSinceEpoch),
            size: await blobsController.QueryBlobSize(rev!.blobId),

            isDirectory: function ()
            {
                return false;
            }
        };
    }

    private SplitPath(absPath: string)
    {
        const slashPos = absPath.indexOf("/", 1);
        if(slashPos === -1)
        {
            return {
                containerName: absPath.substring(1),
                pathInContainer: "/"
            };
        }

        const containerName = absPath.substring(1, slashPos);
        const pathInContainer = absPath.substring(slashPos);

        return {
            containerName,
            pathInContainer
        };
    }
}