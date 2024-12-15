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

export const CONFIG_DB = {
    host: process.env.ODFS_DBHOST!,
    user: process.env.ODFS_DBUSER!,
    password: process.env.ODFS_DBPW!,
};

export const CONFIG_AUDIENCE = process.env.ODFS_AUDIENCE!;
export const CONFIG_MAX_NUMBER_OF_CACHED_BLOCKS = parseInt(process.env.ODFS_MAX_CACHE_SIZE!); //in units of 100 MiB
export const CONFIG_OIDP_ENDPOINT = process.env.ODFS_OIDP_ENDPOINT!;
export const CONFIG_ORIGIN = process.env.ODFS_ORIGIN!;
export const CONFIG_PORT = process.env.ODFS_PORT;

export const CONFIG_RMQ = {
    host: process.env.ODFS_RMQHOST!,
};

export const CONFIG_ROOTDIR = "/srv/OpenDistributedFileStorage";
export const CONFIG_UPLOADDIR = CONFIG_ROOTDIR + "/incoming";