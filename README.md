# CampusGuard Website

A React + TypeScript + Vite website prototype for CampusGuard, designed around a cinematic dark hero, restrained lime accents, editorial typography, and light explanatory sections.

## Current prototype

- Responsive landing page and navigation
- Product and workflow explanations
- Illustrative CSS-built desktop monitoring visual (clearly labelled as illustrative)
- Expandable FAQ
- Early-access application form UI
- Customer portal status modal
- Accessible labels, focus styles, and reduced-motion support

## Important prototype limitations

The access form is **frontend-only**. It does not transmit or store applicant data. The customer portal is not authenticated and does not show real incident data. Do not collect real applicant information until a secure backend, server-side approval workflow, email/invitation flow, and organisation-scoped access controls have been implemented.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Typography

- Manrope — display headings and brand
- DM Sans — body copy and controls
- Instrument Serif — editorial italic accents
- DM Mono — technical labels and timestamps

Fonts are loaded from Google Fonts. A production deployment should review external font/privacy requirements and can self-host licensed font files if preferred.

## Planned next steps

1. Connect a secure application database and admin review workflow.
2. Add invitation-based authentication and organisation membership.
3. Build an incident portal with strict server-side/database tenant isolation.
4. Add optional, explicitly scoped desktop incident-metadata sync only after the portal security model is reviewed.
5. Deploy the static frontend on a free-tier host and verify build/hosting limits.
