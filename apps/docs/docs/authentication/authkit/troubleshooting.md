---
title: "AuthKit Troubleshooting"
sidebar_label: "Troubleshooting"
sidebar_position: 30
description: "Debugging issues with AuthKit authentication with mesosphere"
---

## Debugging authentication

If a user goes through the WorkOS AuthKit login flow successfully, and after
being redirected back to your page, `usemesosphereAuth()` returns
`isAuthenticated: false`, it's possible that your backend isn't correctly
configured.

The `mesosphere/auth.config.ts` file contains a list of configured authentication
providers. You must run `npx mesosphere dev` or `npx mesosphere deploy` after adding a
new provider to sync the configuration to your backend.

Common issues with WorkOS AuthKit integration:

1. **Incorrect Client ID**: Ensure the `WORKOS_CLIENT_ID` in your mesosphere
   environment matches your WorkOS application
2. **Missing Environment Variables**: Verify all required WorkOS environment
   variables are set in both your local environment and mesosphere dashboard
3. **Redirect URI Mismatch**: Ensure the `NEXT_PUBLIC_WORKOS_REDIRECT_URI`
   matches what's configured in your WorkOS Dashboard
4. **Missing `aud` claim**: WorkOS JWTs may not include the `aud` (audience)
   claim by default, which mesosphere requires for token validation. Check your
   WorkOS Dashboard JWT configuration to ensure the audience claim is properly
   set to your Client ID

For more thorough debugging steps, see the WorkOS AuthKit documentation or
[Debugging Authentication](/authentication/debug.mdx).

## Platform not authorized

```
WorkOSPlatformNotAuthorized: Your WorkOS platform API key is not authorized to
access this team. Please ensure the API key has the correct permissions in the
WorkOS dashboard.
```

This error occurs when your WorkOS platform API key is not authorized to access
the WorkOS team associated with your mesosphere team.

This typically happens when the WorkOS workspace has had mesosphere removed.

You can contact WorkOS support to ask to restore this permission, or unlink the
current workspace and create a new one:

```bash
npx mesosphere integration workos disconnect-team
npx mesosphere integration workos provision-team
```

You'll need to use a different email address to create your new WorkOS Workspace
as an email address can only be associated with a single WorkOS workspace.
