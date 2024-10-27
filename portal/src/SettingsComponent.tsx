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

import { BootstrapIcon, JSX_CreateElement, NavItem, RouterComponent } from "acfrontend";

export function SettingsComponent()
{
    return <div className="container">
        <div className="row">
            <div className="col-auto">
                <ul className="nav nav-pills flex-column">
                    <NavItem route={"/settings/containers"}><BootstrapIcon>eyeglasses</BootstrapIcon> Containers</NavItem>
                    <NavItem route={"/settings/storagebackends"}><BootstrapIcon>eyeglasses</BootstrapIcon> Storage backends</NavItem>
                </ul>
            </div>
            <div className="col">
                <RouterComponent />
            </div>
        </div>
    </div>;
}