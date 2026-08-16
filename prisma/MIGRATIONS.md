## Database Migrations
Schema changes must go through `npx prisma migrate dev --name <description>`,
never `npx prisma db push` — db push does not create migration history,
which caused confusion when the token-uniqueness constraint was applied
without a tracked migration. Always confirm `DATABASE_URL` in `.env`
this project uses a remote Neon database, not a local one — `migrate status` and `db push` will silently target whatever `.env` currently points to.

## Admin Account Creation
To create a real admin account via the secure CLI tool:
```bash
npm run create-admin -- --email=you@hospital.com --name="Your Name" --phone="+919876543210"
```
This generates a cryptographically strong random password, outputs it once to the terminal, and provisions the `User` and `Admin` records directly in the database without exposing an HTTP endpoint.

