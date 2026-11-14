const updated = '14 November 2026'

export default function PrivacyPolicy() {
  return <main className="privacy-page" id="top">
    <header className="privacy-header"><a className="brand" href="/" aria-label="CampusGuard home"><img className="brand-image" src="/campusguard-logo.svg" alt="CampusGuard" /></a><a className="button button-outline" href="/">Back to website <span aria-hidden="true">↗</span></a></header>
    <article className="privacy-document">
      <span className="eyebrow">PRIVACY &amp; DATA PROTECTION</span>
      <h1>Privacy Policy</h1>
      <p className="privacy-updated">Last updated: {updated}</p>
      <p className="privacy-lead">This policy explains what personal data CampusGuard receives through its website and customer portal, why it is used, which service providers help operate the service, and how you can exercise your privacy rights.</p>
      <div className="privacy-callout"><b>In brief</b><p>CampusGuard’s website collects information you submit in access applications and pilot inquiries, account details needed for sign-in, and limited operational metadata sent by an approved desktop installation when account sync is used. The website is not designed to receive live camera streams, video recordings, images, or incident footage.</p></div>

      <h2>1. Who is responsible for your data?</h2>
      <p>For personal data collected through this website, the data controller / Data Fiduciary is the CampusGuard team (“CampusGuard”, “we”, “us”). For privacy requests, contact <a href="mailto:campusguard43@gmail.com">campusguard43@gmail.com</a>.</p>
      <p>The current website identifies the operator as “CampusGuard” but does not publish a registered legal-entity name or postal address. Those details should be added here if CampusGuard operates through a registered company, partnership, or other legal entity.</p>
      <p>When a school or other institution decides why and how its CCTV footage is used, that institution may be the Data Fiduciary for that footage and CampusGuard may act as its service provider / Data Processor under the institution’s instructions and agreement. The precise roles depend on the deployment and must be documented with each institution.</p>

      <h2>2. Personal data we collect</h2>
      <h3>A. Early-access application and account</h3>
      <ul>
        <li><b>Name</b> — to identify and address the applicant.</li>
        <li><b>Work email address</b> — to create the account, communicate about the application, sign in, and support password recovery.</li>
        <li><b>Password</b> — supplied to create the account. Authentication is handled by Supabase Auth; CampusGuard’s application database does not store the password as a profile field.</li>
        <li><b>Institution / organisation</b> — to understand the applicant’s organisation and evaluate the request.</li>
        <li><b>Role</b> — to understand the applicant’s relationship to the institution or deployment.</li>
        <li><b>Purpose / evaluation description</b> — optional text describing what the applicant wants to evaluate. Please do not enter sensitive personal data.</li>
        <li><b>Application and approval records</b> — submission time, login approval status, payment approval status, and owner review timestamps / reviewer details.</li>
      </ul>
      <h3>B. Pilot and deployment inquiries</h3>
      <ul>
        <li><b>Name, email address and organisation</b> — to identify the person making the inquiry and respond.</li>
        <li><b>Inquiry topic</b> — whether you are asking for pilot details, deployment planning, or multi-site discussion.</li>
        <li><b>Message</b> — optional text you choose to send. Do not include passwords, student details, health information, CCTV footage, or other sensitive information.</li>
        <li><b>Submission timestamp</b> — to organise and respond to inquiries.</li>
      </ul>
      <h3>C. Customer portal and desktop sync metadata</h3>
      <p>If an approved customer account uses the desktop-to-website sync feature, the website may receive and store:</p>
      <ul>
        <li><b>Server information:</b> server identifier, server name, app version, and last-seen time.</li>
        <li><b>Camera summary:</b> camera totals, AI-enabled camera totals, online-camera count, and camera names attached to incident records.</li>
        <li><b>Incident metadata:</b> incident identifier, camera name, event label, event time, confidence score, severity, review status, whether footage exists locally, and a sequence number.</li>
        <li><b>Account association:</b> the Supabase account identifier used to associate the synced records with the correct customer account.</li>
      </ul>
      <p>These fields can reveal information about activity at a particular institution and may become personal data when they relate to an identifiable person. Customers should avoid putting a person’s name or other unnecessary identifying details into server names, camera names, incident labels, or free-text fields.</p>
      <h3>D. Technical and security information</h3>
      <p>Our hosting, authentication, database, and security providers may process technical information needed to deliver and protect the service, such as IP address, request time, browser or device information, authentication events, and server or error logs. The website code does not currently include a separate advertising or visitor-analytics product. Provider-side logging and retention are subject to each provider’s settings and policies.</p>

      <h2>3. What we use the data for</h2>
      <ul>
        <li>Receive, assess, and manage early-access applications.</li>
        <li>Create and secure customer accounts, authenticate users, and support password recovery.</li>
        <li>Record the owner’s separate login and payment approval decisions and enforce the resulting access permissions.</li>
        <li>Respond to pilot, deployment, pricing, and support inquiries.</li>
        <li>Display customer server summaries and incident metadata in the read-only portal when sync is used.</li>
        <li>Provide an approved customer with a secure, short-lived installer download link.</li>
        <li>Protect the website, investigate misuse, troubleshoot failures, and maintain service security.</li>
        <li>Meet legal obligations and establish, exercise, or defend legal claims where necessary.</li>
      </ul>
      <p>We do not use the submitted information for targeted advertising. We do not sell personal data. We do not use the website’s sync metadata to identify people through facial recognition. The website does not collect card numbers, bank-account credentials, UPI PINs, or payment transaction details; the owner records only a payment approval decision on the application.</p>

      <h2>4. CCTV, video and children’s data</h2>
      <p>CampusGuard is designed around local video analysis in the Windows desktop application. The website sync described above is limited to operational summaries and incident metadata; the website does not request or display live camera streams, video files, images, or incident footage. Footage is intended to remain within the customer’s local environment.</p>
      <p>Because CampusGuard may be deployed in schools, the desktop application can be used in environments where CCTV footage includes children. This website policy does not by itself authorise the collection or monitoring of children’s data, nor does an applicant’s checkbox replace the institution’s obligations to students, parents, staff, or visitors. The institution must determine and document its lawful basis, notices, access controls, retention, and any required agreements before deployment.</p>
      <p>The DPDP Rules, 2025 include a limited child-data provision for an educational institution’s tracking or behavioural monitoring where it is for educational activities or the safety of children enrolled with that institution. This is a conditional exemption for the specified class and purpose; CampusGuard does not assume that the exemption automatically applies to the software vendor or every deployment. Obtain legal advice for the actual school / vendor arrangement.</p>

      <h2>5. Legal basis and consent</h2>
      <p>We ask you to review this policy and affirmatively agree before submitting an early-access application or pilot inquiry. We use the information for the specific purposes described above. Where processing relies on consent, you may withdraw it by contacting us; withdrawal does not make earlier processing unlawful and may mean we can no longer provide the related account or service.</p>
      <p>Some limited processing may also be necessary to provide a service you request, maintain security, or comply with applicable law. We will not treat optional inquiry text as permission to use it for unrelated purposes.</p>

      <h2>6. Where data is stored and who may receive it</h2>
      <p>Website application and inquiry records, authentication records, customer sync metadata, and private installer files are handled through Supabase services. The website is hosted through Vercel. The site loads typefaces from Google Fonts. If you choose to follow a contact link, WhatsApp / Meta or Google services may process information under their own privacy terms. We do not control those external services.</p>
      <ul>
        <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
        <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
        <li><a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">WhatsApp Privacy Policy</a></li>
      </ul>
      <p>The CampusGuard Supabase project is configured in the Asia Pacific (Mumbai) region, ap-south-1. These providers may still process information on infrastructure located outside India, depending on their service operations, support access, backups and the Vercel deployment region, which must be checked in the live account settings. We do not publish a claim that all website data is stored only in India.</p>
      <p>We may disclose information to authorised personnel who need it to review applications, administer accounts, respond to inquiries, or provide support; to service providers acting on our instructions; or where disclosure is required by law. We do not make customer records publicly accessible.</p>

      <h2>7. Security</h2>
      <p>We use server-side access checks, restricted database access, authenticated owner controls, and short-lived signed download links. The service-role credential is intended to remain on the server and not be exposed to the browser. No internet service can guarantee absolute security. Please use a unique password, keep account credentials private, and tell us promptly if you suspect unauthorised account use.</p>

      <h2>8. Retention and deletion</h2>
      <p>We keep application and account records while they are needed to evaluate and administer access, provide the customer account, maintain security, and meet legal obligations. Inquiry records are kept while needed to respond and manage the business relationship. Synced server and incident metadata is associated with the customer account and is intended to be removed when the account and related service records are deleted, subject to legitimate security, dispute, or legal-retention needs.</p>
      <p>The current website repository does not implement an automatic, time-based deletion schedule or a self-service account-erasure control. Until those controls are implemented, deletion requests are handled manually. Contact us using the details below and identify the account or inquiry; we may need to verify your identity before acting. We will explain if any information must be retained by law.</p>

      <p>If we become aware of a personal data breach affecting your data, we will take steps to contain and investigate it and provide notices to affected people and the relevant authority as required by applicable law.</p>

      <h2>9. Your privacy rights and requests</h2>
      <p>Subject to applicable law, you may ask us to:</p>
      <ul>
        <li>Provide a summary of the personal data being processed and the processing activities.</li>
        <li>Correct, complete, or update inaccurate or incomplete information.</li>
        <li>Erase personal data that is no longer required or where erasure is otherwise available under law.</li>
        <li>Withdraw consent for processing that relies on consent.</li>
        <li>Raise a grievance about how your data is handled.</li>
        <li>Nominate another person to exercise your rights in the circumstances permitted by law.</li>
      </ul>
      <p>Email <a href="mailto:campusguard43@gmail.com?subject=CampusGuard%20privacy%20request">campusguard43@gmail.com</a> with the subject “CampusGuard privacy request”. Tell us what you want to do (access, correction, deletion, withdrawal, or grievance) and the email address associated with the request. Do not send your password or identity documents unless we specifically explain a secure and necessary verification process. We aim to respond within 30 days, subject to identity verification and any longer period permitted or required by law.</p>
      <p>If you are not satisfied with our response, you may use the complaint mechanism made available by the Data Protection Board of India once the relevant provisions and mechanism are operational.</p>

      <h2>10. Cookies and browser storage</h2>
      <p>The current website does not include a separate advertising-cookie or analytics-cookie system. Supabase authentication persists a sign-in session in browser storage so the customer portal can keep you signed in. Your browser also makes ordinary network requests to load the site and its fonts. You can clear browser site data or sign out to remove the locally stored session; clearing it may require you to sign in again.</p>

      <h2>11. Changes to this policy</h2>
      <p>We may update this policy when the website, desktop sync, service providers, or applicable law changes. The “Last updated” date at the top identifies the latest published version. Material changes should be presented before collecting new data for a materially different purpose.</p>

      <h2>12. Contact</h2>
      <p><b>CampusGuard privacy contact</b><br/>Email: <a href="mailto:campusguard43@gmail.com">campusguard43@gmail.com</a><br/>Website: <a href="/">campusguardweb.vercel.app</a></p>
      <p className="privacy-disclaimer">This policy is a product-specific privacy notice drafted from the current website implementation and publicly notified Indian DPDP materials. It is not a legal opinion or a substitute for review by an Indian privacy lawyer. Confirm the operator’s legal identity, provider regions, retention schedule, school/customer contracts, and operational deletion process before treating it as final legal compliance documentation.</p>
      <div className="privacy-bottom"><a className="button button-lime" href="/">Return to CampusGuard</a><a href="mailto:campusguard43@gmail.com?subject=CampusGuard%20privacy%20request">Make a privacy request ↗</a></div>
    </article>
    <footer className="privacy-footer">© {new Date().getFullYear()} CampusGuard · Privacy and data protection</footer>
  </main>
}
