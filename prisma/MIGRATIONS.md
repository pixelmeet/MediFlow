## Database Migrations
Schema changes must go through `npx prisma migrate dev --name <description>`,
never `npx prisma db push` — db push does not create migration history,
which caused confusion when the token-uniqueness constraint was applied
without a tracked migration. Always confirm `DATABASE_URL` in `.env`
this project uses a remote Neon database, not a local one — `migrate status` and `db push` will silently target whatever `.env` currently points to.

## Admin Account Creation
Set `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, and `DEFAULT_ADMIN_NAME` in your local `.env`, then run `npm run create-admin` with no arguments to create or reset your fixed admin login.

Alternatively, provide CLI flags directly:
```bash
npm run create-admin -- --email=you@hospital.com --name="Your Name" --phone="+919876543210"
```
This provisions the `User` and `Admin` records directly in the database without exposing an HTTP endpoint.

