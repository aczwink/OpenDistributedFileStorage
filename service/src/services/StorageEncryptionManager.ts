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
import crypto from "crypto";
import { Dictionary } from "acts-util-core";
import { Injectable } from "acts-util-node";
import { DataEncryptionKeysController } from "../data-access/DataEncryptionKeysController";
import { CONST_AUTHTAG_LENGTH } from "../constants";

@Injectable
export class StorageEncryptionManager
{
    constructor(private dataEncryptionKeysController: DataEncryptionKeysController)
    {
        this.cachedKeys = {};
    }

    //Public methods
    public async Decrypt(partitionNumber: number, buffer: Buffer, iv: Buffer, authTag: Buffer)
    {
        const key = await this.FetchKey(partitionNumber);
        
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
            authTagLength: authTag.length,
        });
        decipher.setAuthTag(authTag);
        
        const decrypted = decipher.update(buffer);
        return Buffer.concat([decrypted, decipher.final()]);
    }

    public async Encrypt(partitionNumber: number, buffer: Buffer)
    {
        const iv = crypto.randomBytes(12);
        const key = await this.FetchKey(partitionNumber);

        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
            authTagLength: CONST_AUTHTAG_LENGTH,
        });
    
        const encrypted = cipher.update(buffer);
        const lastBlock = cipher.final();

        return {
            authTag: cipher.getAuthTag(),
            encrypted: Buffer.concat([encrypted, lastBlock]),
            iv,
        };
    }

    //State
    private cachedKeys: Dictionary<Buffer>;

    //Private methods
    private async FetchKey(partitionNumber: number)
    {
        const key = this.cachedKeys[partitionNumber];
        if(key === undefined)
        {
            const dek = await this.dataEncryptionKeysController.QueryDEK(partitionNumber);
            if(dek === undefined)
            {
                const key = crypto.randomBytes(32);
                this.cachedKeys[partitionNumber] = key;
                await this.dataEncryptionKeysController.InsertDEK(partitionNumber, key.toString("hex"));
                return key;
            }

            const key = Buffer.from(dek, "hex");
            this.cachedKeys[partitionNumber] = key;
            return key;
        }

        return key;
    }
}