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

import { OAuth2Config } from "acfrontend";

export const CONFIG_BACKEND = process.env.OPENOBJECTSTORAGE_BACKEND!;
export const CONFIG_BACKENDPORT = parseInt(process.env.OPENOBJECTSTORAGE_BACKEND_PORT!);

export const CONFIG_OIDC: OAuth2Config = {
    flow: "authorizationCode",
    authorizeEndpoint: process.env.OPENOBJECTSTORAGE_AUTH_ENDPOINT!,
    clientId: process.env.OPENOBJECTSTORAGE_CLIENTID!,
    endSessionEndpoint: process.env.OPENOBJECTSTORAGE_ENDSESSION_ENDPOINT!,
    redirectURI: process.env.OPENOBJECTSTORAGE_REDIRECTURI!,
    tokenEndpoint: process.env.OPENOBJECTSTORAGE_TOKEN_ENDPOINT!,
    postLogoutRedirectURI: process.env.OPENOBJECTSTORAGE_POSTLOGOUTREDIRECTURI!
};