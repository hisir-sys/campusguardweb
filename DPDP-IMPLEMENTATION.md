# CampusGuard — DPDP implementation status

Last reviewed: 12 November 2026

This document records what the current **website repository** implements and what still requires operational or legal decisions. It is an engineering checklist, not legal advice or a compliance certificate.

## What the website currently collects

The inventory is reflected in `src/PrivacyPolicy.tsx` and should be updated whenever the code or providers change:

- Early-access application: name, email, password submitted for account creation (handled by Supabase Auth), organisation, role, optional purpose text, account association, application status, independent login/payment approval states, review timestamps and reviewer details.
- Pilot inquiry: name, email, organisation, selected topic, optional message and submission timestamp.
- Customer portal sync metadata: server identifier/name, app version and last-seen time; camera totals and online/AI-enabled counts; incident identifier, camera name, event label, event time, confidence, severity, status, local-footage indicator and sequence number; account association.
- Hosting/authentication/security providers may process IP address, request time, browser/device information, authentication events and server/error logs. Provider-side collection and retention are not fully visible in this repository.
- Supabase authentication persists a session in browser storage. Google Fonts is loaded by the site. WhatsApp/Meta or Google may receive data if a visitor follows those external links.

The website sync endpoint is intended for metadata only. It is not intended to receive camera streams, video files, images or incident footage. Do not add such uploads without a separate privacy and security review.

## Implemented safeguards

- A public, standalone privacy page is available at `/privacy`.
- The access-application and pilot-inquiry forms link to the notice and require a separate affirmative checkbox.
- Both API endpoints reject submissions without consent and the expected notice version.
- The APIs record `privacy_notice_version` and `privacy_consent_at` in Supabase.
- Passwords are handled through Supabase Auth rather than stored as an application-table profile field.
- The website does not claim India-only data storage; actual Supabase and Vercel regions must be checked in the live projects.
- The policy says deletion requests are currently manual; it does not falsely claim automated retention or self-service erasure.

## DPDP commencement context

The Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 have phased commencement under the Gazette notifications. Some institutional and administrative provisions commenced on publication; the one-year and eighteen-month tranches have separate dates. The main notice, consent, rights and processing obligations in the eighteen-month tranche are scheduled from **13 May 2027**, calculated from the 13 November 2025 publication. Do not describe CampusGuard as “DPDP certified” or claim that every provision is already in force. Re-check the Gazette and applicable amendments before launch or legal reliance.

The Rules' notice framework calls for a clear, standalone notice that identifies the personal data and the specific purposes, and explains how consent can be withdrawn and rights/grievances can be exercised. The website policy is structured to provide those particulars for the data visible in this repository.

## Remaining work that cannot safely be guessed

These items need real operational decisions and/or owner-provided details:

1. **Legal operator identity:** publish the actual legal entity / proprietor name and a valid postal address. The repository currently identifies the operator only as “CampusGuard”.
2. **Provider locations:** verify the configured Supabase project region, Vercel deployment region, backup location and any relevant cross-border support access. Update the notice only with verified facts.
3. **Retention schedule:** choose and implement retention periods for unapproved applications, inquiries, account records, synced metadata, security logs and backups. The current code has no automatic deletion job.
4. **Rights/deletion workflow:** define who receives requests, how identity is verified, how requests are tracked, and how deletion propagates to Auth, database rows, storage and backups. The current policy accurately says requests are manual.
5. **School/customer contracts:** document whether each school is the Data Fiduciary and CampusGuard acts as a Data Processor, or whether roles differ. Put instructions, permitted purposes, security, retention, breach escalation and deletion obligations in the agreement.
6. **Desktop sync choice:** add a separate, clear notice and affirmative enable/disable control in the Windows desktop app before it sends customer/server/incident metadata to the website. The website form checkbox is only for the application or inquiry; it is not a substitute for this desktop choice.
7. **Incident response:** define an owner, escalation path, evidence handling and notification procedure for personal-data breaches.
8. **Contact details:** confirm that `campusguard43@gmail.com` is monitored for privacy requests and publish the legal entity/address alongside it.

## Before production use

- Run `supabase/setup-campusguard.sql` in the correct Supabase project (or run the two individual migrations if preferred).
- Confirm Vercel production environment variables and Supabase project configuration.
- Confirm the legal identity, address, regions and retention policy above.
- Review the notice whenever form fields, sync payloads, providers or purposes change.
- Have an Indian privacy professional review the real deployment and school contracts.

No document or code change can substitute for those real-world confirmations.
