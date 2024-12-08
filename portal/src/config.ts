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

import { OAuth2Config } from "acfrontend";

export const CONFIG_BACKEND = {
    host: process.env.ODFS_BACKEND_HOST!,
    port: parseInt(process.env.ODFS_BACKEND_PORT!),
    protocol: process.env.ODFS_BACKEND_PROTOCOL! as "http" | "https",
};

export const CONFIG_OIDC: OAuth2Config = {
    flow: "authorizationCode",
    authorizeEndpoint: process.env.ODFS_AUTH_ENDPOINT!,
    clientId: process.env.ODFS_CLIENTID!,
    endSessionEndpoint: process.env.ODFS_ENDSESSION_ENDPOINT!,
    redirectURI: process.env.ODFS_REDIRECTURI!,
    tokenEndpoint: process.env.ODFS_TOKEN_ENDPOINT!,
    postLogoutRedirectURI: process.env.ODFS_POSTLOGOUTREDIRECTURI!
};