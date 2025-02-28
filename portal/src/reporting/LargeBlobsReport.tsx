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

import { JSX_CreateElement, JSX_Fragment, Use, UseAPI } from "acfrontend";
import { LargeBlobReportEntry } from "../../dist/api";
import { APIService } from "../services/APIService";

function ReportTable(input: { entries: LargeBlobReportEntry[] })
{
    return <>
        <table className="table table-sm table-striped">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Blob</th>
                    <th>Blob size</th>
                    <th>Stored size</th>
                </tr>
            </thead>
            <tbody>
                {input.entries.map((x, i) => <tr>
                    <td>{x.filePath}</td>
                    <td>{x.blobId}</td>
                    <td>{x.fileSize.FormatBinaryPrefixed()}</td>
                    <td>{x.storedSize.FormatBinaryPrefixed()}</td>
                </tr>)}
            </tbody>
        </table>
    </>;
}

export function LargeBlobsReport()
{
    const apiState = UseAPI( () => Use(APIService).reporting.largeblobs.get() );
    return apiState.success ? <ReportTable entries={apiState.data} /> : apiState.fallback;
}