# Password-reset email (formal, sent from campusguard43@gmail.com)

The reset flow is already in the code (website "Forgot password?" and the app's "Forgot password" both call Supabase;
the link opens `/reset-password`). These two dashboard steps make the email come from campusguard43@gmail.com.

1. Gmail: turn on 2-Step Verification for campusguard43@gmail.com, then create an App password
   (Google Account → Security → App passwords). Use that 16-character password below, never the normal one.
2. Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:
   - Sender email: campusguard43@gmail.com   Sender name: CampusGuard
   - Host: smtp.gmail.com   Port: 465   Username: campusguard43@gmail.com   Password: the app password
3. Supabase → Authentication → Emails → Templates → "Reset Password": set Subject to
   `Reset your CampusGuard password` and paste the contents of `recovery.html`.
4. Supabase → Authentication → URL Configuration: Site URL = https://campusguardweb.vercel.app and add
   https://campusguardweb.vercel.app/reset-password to Redirect URLs.
5. Test: Forgot password on the website with an approved account's email.

Gmail allows roughly 500 messages a day, which is plenty for now; move to a transactional provider later if needed.
