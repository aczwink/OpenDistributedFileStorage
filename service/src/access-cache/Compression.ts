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
import zlib from "zlib";

export function Compress(data: string)
{
    return new Promise<Buffer>( (resolve, reject) => {
        zlib.gzip(data, {
            level: zlib.constants.Z_BEST_COMPRESSION,
        }, (error, result) => {
            if(error !== null)
                reject(error);
            else
                resolve(result);
        });
    });
}

export function Decompress(data: Buffer)
{
    return new Promise<Buffer>( (resolve, reject) => {
        zlib.gunzip(data, (error, result) => {
            if(error !== null)
                reject(error);
            else
                resolve(result);
        });
    });
}