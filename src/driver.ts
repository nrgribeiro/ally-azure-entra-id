/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| Make sure you through the code and comments properly and make necessary
| changes as per the requirements of your implementation.
|
*/

/**
|--------------------------------------------------------------------------
 *  Search keyword "AzureEntraId" and replace it with a meaningful name
|--------------------------------------------------------------------------
 */

import { Oauth2Driver } from '@adonisjs/ally'
import type { HttpContext } from '@adonisjs/core/http'
import type { AllyDriverContract, AllyUserContract, ApiRequestContract } from '@adonisjs/ally/types'

/**
 *
 * Access token returned by your driver implementation. An access
 * token must have "token" and "type" properties and you may
 * define additional properties (if needed)
 */
export type AzureEntraIdAccessToken = {
  token: string
  type: 'bearer'
}

/**
 * Scopes accepted by the driver implementation.
 */
export type AzureEntraIdScopes = string

/**
 * The configuration accepted by the driver implementation.
 */
export type AzureEntraIdConfig = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  tenantId: string
  scopes?: AzureEntraIdScopes[]
}

/**
 * Driver implementation. It is mostly configuration driven except the API call
 * to get user info.
 */
export class AzureEntraId
  extends Oauth2Driver<AzureEntraIdAccessToken, AzureEntraIdScopes>
  implements AllyDriverContract<AzureEntraIdAccessToken, AzureEntraIdScopes> {
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = 'https://graph.microsoft.com/oidc/userinfo'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'AzureEntraId_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  constructor(
    ctx: HttpContext,
    public config: AzureEntraIdConfig
  ) {
    super(ctx, config)

    this.authorizeUrl = this.authorizeUrl.replace('{tenant}', config.tenantId)
    this.accessTokenUrl = this.accessTokenUrl.replace('{tenant}', config.tenantId)

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
 * Configuring the redirect request with defaults for Microsoft Entra ID
 */
  configureRedirectRequest(request) {
    // Set the default scopes if none are provided in the config
    request.scopes(this.config.scopes || [
      "openid",
      "profile",
      "User.Read",
      "email"
    ]);

    // Microsoft-specific parameters for the redirect request
    request.param("response_type", "code");

  }

  /**
   * Optionally configure the access token request. The actual request is made by
   * the base implementation of "Oauth2" driver and this is a hook to pre-configure
   * the request
   */
  // protected configureAccessTokenRequest(request: ApiRequest) {}

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
  async user(
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<AzureEntraIdAccessToken>> {
    const accessToken = await this.accessToken()
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl).header(
      'Authorization',
      `Bearer ${accessToken.token}`
    )

    // Allow further configuration if needed
    if (typeof callback === 'function') {
      callback(request)
    }

    // Fetch user data from Microsoft Graph API
    // Send the request to get user data
    const response = await request.get()

    // Check if the response is a string, and parse if necessary
    const userData = typeof response === 'string' ? JSON.parse(response) : response

    return {
      id: userData['sub'] || userData.id, // Using `sub` for OpenID or `id` as fallback
      nickName: userData.name,
      name: userData.name,
      email: userData.email || userData.userPrincipalName, // Support both fields
      avatarUrl: userData.picture, // Microsoft Graph doesn't return photo by default
      emailVerificationState: 'verified',
      original: userData,
      token: {
        token: accessToken.token,
        type: accessToken.type,
      },
    }
  }

  async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl).header(
      'Authorization',
      `Bearer ${accessToken}`
    )

    // Allow further configuration if needed
    if (typeof callback === 'function') {
      callback(request)
    }

    // Fetch user data from Microsoft Graph API
    const userResponse = await request.get()
    const userData = userResponse.body()

    return {
      id: userData.sub || userData.id,
      nickName: userData.displayName,
      name: userData.displayName,
      email: userData.mail || userData.userPrincipalName,
      avatarUrl: userData.photo,
      emailVerificationState: 'verified',
      original: userData,
      token: {
        token: accessToken,
        type: 'bearer',
      },
    }
  }
}

/**
 * The factory function to reference the driver implementation
 * inside the "config/ally.ts" file.
 */
export function AzureEntraIdService(config: AzureEntraIdConfig): (ctx: HttpContext) => AzureEntraId {
  return (ctx) => new AzureEntraId(ctx, config)
}
