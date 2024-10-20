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

import { JSX_CreateElement, OAuth2Guard, Routes } from "acfrontend";
import { ListContainersComponent } from "./containers/ListContainersComponent";
import { CreateContainersComponent } from "./containers/CreateContainersComponent";
import { ContainerSelectionComponent } from "./file-explorer/ContainerSelectionComponent";
import { FileExplorerComponent } from "./file-explorer/FileExplorerComponent";
import { ViewFileComponent } from "./file-explorer/ViewFileComponent";
import { ViewFileContentComponent } from "./file-explorer/ViewFileContentComponent";
import { ViewFileRevisionsComponent } from "./file-explorer/ViewFileRevisionsComponent";
import { CONFIG_OIDC } from "./config";
import { SCOPE_ADMIN, SCOPE_FILES_READ } from "./definitions";

const fileRoutes: Routes = [
    { path: "revisions", component: <ViewFileRevisionsComponent /> },
    { path: "content", component: <ViewFileContentComponent /> },
    { path: "", redirect: "content" }
];

const containerRoutes: Routes = [
    { path: "{fileId}", component: <ViewFileComponent />, children: fileRoutes, },
    { path: "", component: <FileExplorerComponent /> }
];

const settingsRoutes: Routes = [
    { path: "containers/create", component: <CreateContainersComponent /> },
    { path: "containers", component: <ListContainersComponent /> },
    { path: "", redirect: "containers" }
];

export const routes : Routes = [
    { path: "accessdenied", component: <p>Access denied.</p> },
    { path: "settings", children: settingsRoutes, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_ADMIN] }) ] },
    { path: "{containerId}", children: containerRoutes, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_FILES_READ] }) ] },
    { path: "", component: <ContainerSelectionComponent />, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_FILES_READ] }) ] }
];