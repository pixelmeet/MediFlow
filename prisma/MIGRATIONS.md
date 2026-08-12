## Database Migrations
Schema changes must go through `npx prisma migrate dev --name <description>`,
never `npx prisma db push` — db push does not create migration history,
which caused confusion when the token-uniqueness constraint was applied
without a tracked migration. Always confirm `DATABASE_URL` in `.env`
points to the intended database before running migration commands, since
this project uses a remote Neon database, not a local one — `migrate
status` and `db push` will silently target whatever `.env` currently
points to.
