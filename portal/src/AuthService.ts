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

import { Injectable, OAuth2Service } from "acfrontend";

@Injectable
export class AuthService
{
    constructor(private oAuth2Service: OAuth2Service)
    {
        this.accessToken = "";
    }
    
    //Public methods
    public async HandleLoginFlow()
    {
        if(this.accessToken.length > 0)
            return;
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if(code === null)
        {
            this.oAuth2Service.PerformRedirectLogin({
                authorizeEndpoint: process.env.OPENOBJECTSTORAGE_AUTH_ENDPOINT!,
                clientId: process.env.OPENOBJECTSTORAGE_CLIENTID!,
                redirectURI: process.env.OPENOBJECTSTORAGE_REDIRECTURI!,
                scopes: ["openid"]
            });
        }
        else
        {
            const response = await this.oAuth2Service.RedeemAuthorizationCode(process.env.OPENOBJECTSTORAGE_TOKEN_ENDPOINT!, process.env.OPENOBJECTSTORAGE_CLIENTID!, code);
            console.log(response);
            if("error" in response)
                throw new Error("TODO: implement me");
            else
                this.accessToken = response.access_token;
        }
    }

    //Private state
    private accessToken: string;
}