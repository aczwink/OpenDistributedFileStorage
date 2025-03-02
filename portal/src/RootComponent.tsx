/**
 * OpenDistributedFileStorage
 * Copyright (C) 2024-2025 Amir Czwink (amir130@hotmail.de)
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
import { BootstrapIcon, Component, Injectable, JSX_CreateElement, JSX_Fragment, Navigation, NavItem, OAuth2Service, OAuth2TokenManager, Router, RouterComponent } from "acfrontend";
import { CONFIG_OIDC } from "./config";
import { SCOPE_FILES_WRITE } from "./definitions";
import { APIService } from "./services/APIService";

@Injectable
export class RootComponent extends Component
{
    constructor(private oAuth2Service: OAuth2Service, private oAuth2TokenManager: OAuth2TokenManager, private apiService: APIService, private router: Router)
    {
        super();
    }
    
    protected Render()
    {
        return <>
            <Navigation>
                <ul className="nav nav-pills ms-auto">
                    {this.RenderConditional()}
                    <NavItem route="/settings"><BootstrapIcon>gear-wide-connected</BootstrapIcon></NavItem>
                    <li>
                        <a className="nav-link text-danger"><BootstrapIcon>box-arrow-right</BootstrapIcon></a>
                    </li>
                </ul>
            </Navigation>
            <div className="container-fluid">
                <RouterComponent />
            </div>
        </>;
    }

    //Private methods
    private RenderEditCheck()
    {
        if(!this.apiService.readOnly)
            return null;
        const icon = this.apiService.readOnly ? "lock-fill" : "unlock-fill";
        return <li><a className="nav-link" role="button" onclick={this.OnWantEditMode.bind(this)}><BootstrapIcon>{icon}</BootstrapIcon></a></li>;
    }

    private RenderConditional()
    {
        if(this.router.state.Get().ToUrl().path.startsWith("/settings"))
            return <li><NavItem route="/"><BootstrapIcon>house</BootstrapIcon></NavItem></li>;
        
        return <>
            {this.RenderRecycleBin()}
            {this.RenderEditCheck()}
        </>;
    }

    private RenderRecycleBin()
    {
        const containerId = this.router.state.Get().routeParams.containerId;
        if(containerId === undefined)
            return null;
        return <li><NavItem route={"/" + containerId + "/recyclebin"}><BootstrapIcon>trash</BootstrapIcon></NavItem></li>;
    }

    //Event handlers
    override async OnInitiated(): Promise<void>
    {
        this.oAuth2TokenManager.tokenIssued.Subscribe(this.Update.bind(this));
        this.router.state.Subscribe(this.Update.bind(this));
    }

    private OnWantEditMode()
    {
        this.oAuth2Service.RequestScopes(CONFIG_OIDC, [SCOPE_FILES_WRITE]);
    }
}