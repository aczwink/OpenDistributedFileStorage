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
export const CONST_SERVICE_USER_FAKEID = "__ODFS_SVCUSER__";

export const CONST_FILESEQUENCECACHE_NUMBER_OF_ENTRIES_PER_BLOCK = 1000;

export const CONST_BLOCKSIZE = 100 * 1024 * 1024; //100 MiB
export const CONST_NUMBER_OF_STORAGE_BLOCKS_PER_DIR = 10000;

export const CONST_AUTHTAG_LENGTH = 16;

export const CONST_STORAGEBLOCKS_MAX_REPLICATION = 3;

export enum StorageTier
{
    Hot = 0,
    Cool = 1,
    Archive = 2
}