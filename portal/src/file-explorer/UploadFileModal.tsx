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

import { BootstrapIcon, Component, Injectable, JSX_CreateElement, PopupRef } from "acfrontend";
import { APIService } from "../services/APIService";

interface FileContext
{
    type: "newrevision";
    fileId: number;
}
interface ContainerDirContext
{
    type: "newfile";
    containerId: number;
    parentPath: string;
}

type Context = FileContext | ContainerDirContext;

interface FileUploadState
{
    success: boolean;
    error?: string;
    fileIndex: number;
    uploadedBytes: number;
}

@Injectable
export class UploadFileModal extends Component<{ context: Context; files: File[]; onFinish: (success: boolean) => void }>
{
    constructor(private apiService: APIService, private popupRef: PopupRef)
    {
        super();

        this.state = [];
    }

    protected Render(): RenderValue
    {
        return <div className="modal-dialog">
            <div className="modal-content">
                <div className="modal-body">
                    <table className="table">
                        <tbody>
                            {this.state.map(this.RenderRow.bind(this))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>;
    }

    //Private methods
    private async InitUpload(file: File, state: FileUploadState)
    {
        const c = this.input.context;
        if(c.type === "newfile")
        {
            const response = await this.apiService.upload.newfile.post({ containerId: c.containerId, fileName: file.name, mediaType: file.type, parentPath: c.parentPath });
            switch(response.statusCode)
            {
                case 200:
                    return response.data;
                case 403:
                case 404:
                    state.error = "An unexpected error occured during file upload.";
                    this.Update();
                    return null;
                case 409:
                    state.error = "File exists already!";
                    this.Update();
                    return null;
            }
        }
        else
        {
            const response = await this.apiService.upload.revision.post({ fileId: c.fileId });
            if(response.statusCode !== 200)
            {
                state.error = "An error occured while uploading the new revision.";
                this.Update();
                return null;
            }

            return response.data;
        }
    }

    private async OrchestrateFileUpload(file: File, state: FileUploadState)
    {
        const uploadKey = await this.InitUpload(file, state);
        if(uploadKey === null)
            return false;

        const chunkSize = 50 * 1024 * 1024; //50 MiB
        for(let start = 0; start < file.size;)
        {
            const chunk = file.slice(start, start + chunkSize);
            const response = await this.apiService.upload.chunk.post({
                chunk,
                uploadKey
            });
            if(response.statusCode !== 204)
            {
                state.error = "An unexpected error occured during file upload.";
                this.Update();
                return false;
            }

            start += chunk.size;
            state.uploadedBytes = start;
            this.Update();
        }

        const response2 = await this.apiService.upload.finish.post({ uploadKey });
        if(response2.statusCode !== 204)
        {
            state.error = "An unexpected error occured during file upload.";
            this.Update();
            return false;
        }
        return true;
    }

    private async OrchestrateUpload()
    {
        let totalSuccess = true;
        for(let i = 0; i < this.input.files.length; i++)
        {
            const state: FileUploadState = {
                fileIndex: i,
                uploadedBytes: 0,
                success: false,
            };
            this.state.push(state);
            const success = await this.OrchestrateFileUpload(this.input.files[i], state);
            if(success)
            {
                setTimeout(() => this.state.shift(), 5000);
                state.success = true;
            }
            else
                totalSuccess = false;
        }

        if(totalSuccess)
            this.popupRef.Close();
        
        this.input.onFinish(totalSuccess);
    }

    private RenderRow(state: FileUploadState)
    {
        const file = this.input.files[state.fileIndex];
        const percent = Math.round(state.uploadedBytes / file.size * 100);
        return <tr>
            <td>{file.name}</td>
            <td>
                <div className="progress">
                    <div className="progress-bar" style={"width: " + percent + "%"}>{percent}%</div>
                </div>
            </td>
            {this.RenderStatus(state)}
        </tr>;
    }

    private RenderStatus(state: FileUploadState)
    {
        if(state.error !== undefined)
            return <td className="text-danger">{state.error}</td>;
        if(state.success)
            return <td className="text-success"><BootstrapIcon>check2</BootstrapIcon></td>;
        return <td className="text-primary"><BootstrapIcon>hourglass-split</BootstrapIcon></td>;
    }

    //Event handlers
    override OnInitiated(): void
    {
        this.OrchestrateUpload();
    }

    //State
    private state: FileUploadState[];
}