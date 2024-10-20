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
import { API } from "../dist/api";
import { APIServiceBase, HTTPService, Injectable, OAuth2TokenManager } from "acfrontend";
import { CONFIG_BACKEND, CONFIG_BACKENDPORT, CONFIG_OIDC } from "./config";
import { SCOPE_FILES_WRITE } from "./definitions";

@Injectable
export class APIService extends API
{
    constructor(httpService: HTTPService, private oAuth2TokenManager: OAuth2TokenManager)
    {
        super( req => this.base.SendRequest(req) );

        this.base = new APIServiceBase(httpService, CONFIG_BACKEND, CONFIG_BACKENDPORT, "http");

        oAuth2TokenManager.tokenIssued.Subscribe(x => this.accessToken = x.accessToken);
    }

    //Properties
    public get readOnly()
    {
        const canWrite = this.oAuth2TokenManager.AreScopesGranted(CONFIG_OIDC, [SCOPE_FILES_WRITE]);
        return !canWrite;
    }

    //Private properties
    private set accessToken(value: string)
    {
        this.base.globalHeaders.Authorization = "Bearer " + value;
    }

    //State
    private base: APIServiceBase;
}