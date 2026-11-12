# CampusGuard Website

React + TypeScript + Vite website and customer portal for CampusGuard, with Supabase authentication, owner-reviewed access applications, and a private Windows installer.

## Access approval workflow

- A user submits **one early-access application** and creates one account.
- The owner reviews that application with two independent decisions: **Login approval** and **Payment approval**.
- The user can sign in, use the customer portal, sync desktop metadata, and download the installer only after **both** decisions are approved.
- The installer is served through a short-lived signed URL from the private `campusguard-downloads` storage bucket.
- The admin console keeps the existing visual design and presents both approval controls on the same application card. There is no second user-facing download application.

## Privacy and data protection

- The public, standalone privacy notice is available at `/privacy` and linked in the website footer and both data-submission forms.
- Access applications and pilot inquiries require an affirmative privacy-notice checkbox. The accepted notice version and timestamp are recorded in Supabase.
- The policy itemizes the data fields currently visible in this website repository, their purposes, the named service providers, browser session storage, rights/request contact and the current manual deletion process.
- The notice does not claim that all data is stored in India, that footage is uploaded, or that CampusGuard is DPDP-certified.
- See [DPDP-IMPLEMENTATION.md](./DPDP-IMPLEMENTATION.md) for the engineering inventory, phased commencement note and remaining operational/legal launch tasks.
- The policy is based on this repository's implementation. Provider-side telemetry, actual data regions and retention settings must be verified in the live provider accounts.

## Supabase database setup

**Recommended: run one combined script.**

1. Open the correct project at [Supabase](https://supabase.com/dashboard).
2. In the left sidebar, open **SQL Editor**.
3. Choose **New query**.
4. Open `supabase/setup-campusguard.sql` in this repository and copy the complete contents.
5. Paste the SQL into the editor and click **Run**.
6. Confirm the query completes without errors.

The combined script is safe to re-run for its column and index additions. It performs the existing migration from legacy download approvals, so run it against the CampusGuard project that already contains `access_applications` and `download_requests`. Do not run it against an unrelated or empty Supabase project.

Alternatively, run the two individual migrations in this order:

1. `supabase/single-application-approvals.sql`
2. `supabase/privacy-consent.sql`

The approval migration adds independent login/payment decisions and reviewer timestamps to the single application record. Existing approved/rejected login decisions are carried forward. A legacy payment decision is carried forward as approved only when the latest download request was approved and `payment_confirmed = true`; other payment decisions remain pending unless the latest request was rejected.

The privacy migration adds `privacy_notice_version` and `privacy_consent_at` to both `access_applications` and `pilot_inquiries`.

## Supabase Storage and environment

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
- Website sync stores summary and incident metadata only; video and footage remain in the local desktop/server workflow.
- The Supabase service role is used only in serverless API routes.
- Owner actions require a verified Supabase session whose email matches `ADMIN_EMAIL`.

## Typography

- Manrope — display headings and brand
- DM Sans — body copy and controls
- Instrument Serif — editorial italic accents
- DM Mono — technical labels and timestamps
