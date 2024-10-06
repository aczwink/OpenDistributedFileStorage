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
import { Component, Injectable, OAuth2Service } from "acfrontend";

@Injectable
export class RootComponent extends Component
{
    constructor(private oAuth2Service: OAuth2Service)
    {
        super();
    }

    protected Render()
    {
        return "TODO";
    }

    //Event handlers
    override OnInitiated(): void
    {
        this.oAuth2Service.PerformRedirectLogin({
            authorizeEndpoint: process.env.OPENOBJECTSTORAGE_AUTH_ENDPOINT!,
            clientId: process.env.OPENOBJECTSTORAGE_CLIENTID!,
            redirectURI: process.env.OPENOBJECTSTORAGE_REDIRECTURI!,
            scopes: []
        });
    }
}