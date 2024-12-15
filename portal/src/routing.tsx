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

import { JSX_CreateElement, OAuth2Guard, OAuth2LoginRedirectHandler, Routes } from "acfrontend";
import { ListContainersComponent } from "./containers/ListContainersComponent";
import { CreateContainersComponent } from "./containers/CreateContainersComponent";
import { ContainerSelectionComponent } from "./file-explorer/ContainerSelectionComponent";
import { FileExplorerComponent } from "./file-explorer/FileExplorerComponent";
import { ViewFileComponent } from "./file-explorer/ViewFileComponent";
import { ViewFileContentComponent } from "./file-explorer/ViewFileContentComponent";
import { ViewFileRevisionsComponent } from "./file-explorer/ViewFileRevisionsComponent";
import { CONFIG_OIDC } from "./config";
import { SCOPE_ADMIN, SCOPE_FILES_READ, SCOPE_FILES_WRITE } from "./definitions";
import { EditFileAttributesComponent } from "./file-explorer/EditFileAttributesComponent";
import { SettingsComponent } from "./SettingsComponent";
import { ListStorageBackendsComponent } from "./storage-backends/ListStorageBackendsComponent";
import { CreateStorageBackendComponent } from "./storage-backends/CreateStorageBackendComponent";
import { ViewFileVersionsComponent } from "./file-explorer/ViewFileVersionsComponent";
import { CreateFileVersionComponent } from "./file-explorer/CreateFileVersionComponent";
import { FileAccessesComponent } from "./file-explorer/FileAccessesComponent";
import { EditAVMetaDataComponent } from "./file-explorer/metadata/EditAVMetaDataComponent";
import { ViewImageMetaDataComponent } from "./file-explorer/metadata/ViewImageMetaDataComponent";

const writeGuard = new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_FILES_WRITE] });

const fileRoutes: Routes = [
    { path: "accesses", component: <FileAccessesComponent /> },
    { path: "content", component: <ViewFileContentComponent /> },
    { path: "edit", component: <EditFileAttributesComponent />, guards: [ writeGuard ] },
    { path: "metadata", component: <EditAVMetaDataComponent />, guards: [ writeGuard ] },
    { path: "imgmetadata", component: <ViewImageMetaDataComponent /> },
    { path: "revisions", component: <ViewFileRevisionsComponent /> },
    { path: "versions/create", component: <CreateFileVersionComponent />, guards: [ writeGuard ] },
    { path: "versions", component: <ViewFileVersionsComponent /> },
    { path: "", redirect: "content" }
];

const containerRoutes: Routes = [
    { path: "{fileId}", component: <ViewFileComponent />, children: fileRoutes, },
    { path: "", component: <FileExplorerComponent /> }
];

const settingsRoutes: Routes = [
    { path: "containers/create", component: <CreateContainersComponent /> },
    { path: "containers", component: <ListContainersComponent /> },
    { path: "storagebackends/create", component: <CreateStorageBackendComponent /> },
    { path: "storagebackends", component: <ListStorageBackendsComponent /> },
    { path: "", redirect: "containers" }
];

export const routes : Routes = [
    { path: "accessdenied", component: <p>Access denied.</p> },
    { path: "settings", component: <SettingsComponent />, children: settingsRoutes, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_ADMIN] }) ] },
    { path: "oauth2loggedin", component: <OAuth2LoginRedirectHandler /> },
    { path: "{containerId}", children: containerRoutes, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_FILES_READ] }) ] },
    { path: "", component: <ContainerSelectionComponent />, guards: [ new OAuth2Guard({ config: CONFIG_OIDC, scopes: [SCOPE_FILES_READ] }) ] }
];