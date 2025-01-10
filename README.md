# Ally driver for Azure Entra ID
> A Microsoft Azure Entra ID driver for [AdonisJS Ally](https://docs.adonisjs.com/guides/social-auth).


## Getting started

`npm i ally-azure-entraid`


## Usage
Add the driver configuration within the `config/ally.ts` file of an AdonisJS application. For example:

```ts
import { AzureEntraIdService } from 'ally-azure-entraid'

defineConfig({
  azure: AzureEntraIdService({
    clientId: env.get('MICROSOFT_CLIENT_ID') || '',
    clientSecret: env.get('MICROSOFT_CLIENT_SECRET') || '',
    callbackUrl: env.get('MICROSOFT_CALLBACK_URL') || 'http://localhost:3333/auth/azure/callback',
    tenantDomain: env.get('MICROSOFT_TENANT_ID') || '',
    scopes: ['openid', 'profile', 'email'],
  })
})
```
