# CampusGuard Website

React + TypeScript + Vite website and customer portal for CampusGuard, with Supabase authentication, owner-reviewed access applications, and a private Windows installer.

## Access approval workflow

- A user submits **one early-access application** and creates one account.
- The owner reviews that application with two independent decisions: **Login approval** and **Payment approval**.
- The user can sign in, use the customer portal, sync desktop metadata, and download the installer only after **both** decisions are approved.
- The installer is served through a short-lived signed URL from the private `campusguard-downloads` storage bucket.
- The admin console keeps the existing visual design and presents both approval controls on the same application card. There is no second user-facing download application.

## Privacy and Supabase setup

- The public privacy notice is available at `/privacy` and linked in the website footer and both data-submission forms.
- Access applications and pilot inquiries require an affirmative privacy-notice checkbox. The accepted notice version and timestamp are recorded in Supabase.
- Run `supabase/privacy-consent.sql` once in the Supabase SQL Editor to add the consent-record columns before deploying this code.
- The notice documents the fields currently collected by the website, customer sync metadata, providers, browser session storage, and the current manual deletion process. Confirm operator legal identity, provider regions, and retention procedures before treating it as final legal compliance advice.

## Supabase setup

Before deploying this version, run `supabase/single-application-approvals.sql` once in the Supabase SQL Editor. It adds the two approval states and reviewer timestamps to `access_applications`, then safely migrates existing decisions:
- Existing approved/rejected access applications become the initial login decision.
- Payment becomes approved only when a legacy download request was explicitly approved **and** `payment_confirmed = true`.
- All other legacy payment states remain pending (or preserve a latest rejection).

Keep `campusguard-downloads` as a **private** Storage bucket and upload the installer as `CampusGuard.exe`.

Required server environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`

Frontend environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The service-role key must never be exposed to the browser.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Security boundaries

- Approval is checked server-side for sign-in status, desktop metadata sync, and installer downloads.
- Website sync stores summary and incident metadata only; video and footage remain on the local desktop/server workflow.
- The Supabase service role is used only in serverless API routes.
- Owner actions require a verified Supabase session whose email matches `ADMIN_EMAIL`.

## Typography

- Manrope — display headings and brand
- DM Sans — body copy and controls
- Instrument Serif — editorial italic accents
- DM Mono — technical labels and timestamps
