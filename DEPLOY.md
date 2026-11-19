# Deploying Rent Ghar to the live server

Server folder: `/home/rentghar/htdocs/rentghar.pk` · website port **3117** · API port **3118** (internal only) · MongoDB database **rentghar**, user **rentghar**.

## What you upload yourself (not in git)

The files in `deploy/live-env/` already have the right names and folders — upload them to the same place inside the site folder.

| On your PC (`C:\Users\xomoe\Rent Ghar\…`) | On the server (`/home/rentghar/htdocs/rentghar.pk/…`) |
| --- | --- |
| `deploy/live-env/apps/api/.env` | `apps/api/.env` |
| `deploy/live-env/apps/web/.env` | `apps/web/.env` |
| `deploy/rentghar-db.json.gz` | `deploy/rentghar-db.json.gz` |
| `uploads/` (whole folder) | `uploads/` |

`apps/web/.env.production` (the public site URL) is already in git.

If you changed anything locally since the last export, make a fresh one before you upload:

```bash
npm run db:export
```

## First deploy

```bash
cd /home/rentghar/htdocs/rentghar.pk
git clone https://github.com/moezlogics/Rntghr.git .     # first time; later just: git pull
# upload the four items in the table above, then:
npm ci
NODE_OPTIONS=--max-old-space-size=6144 npm run build      # 1. build (web + api)
node scripts/db/import-live.js --admin-email you@example.com --admin-password 'choose-a-strong-password'   # 2. DB user + database + data, then deletes itself
pm2 start ecosystem.config.js                             # 3. start
pm2 save
pm2 startup                                               # once: run the command it prints, so PM2 starts after a reboot
```

1. **Build** needs `apps/web/.env` in place first (the website reads the API address at build time).
2. **`import-live.js`** does the whole database setup in one go:
   - creates the MongoDB user `rentghar` with the password in `MONGODB_URI` (apps/api/.env), with access to the `rentghar` database only;
   - creates the `rentghar` database and loads everything (cities, areas, listings, media library, settings, plans). Listings copied from other portals arrive as **drafts**: open *Dashboard → Properties → Draft*, check each one, and publish it;
   - sets the dashboard login from `--admin-email` / `--admin-password` (the local test password is never used on the live site);
   - locks `apps/api/.env` and `apps/web/.env` so only their owner can read them, then **deletes itself and `deploy/rentghar-db.json.gz`** (add `--keep` to keep them).

   `--dry-run` shows what it would do without changing anything. If your MongoDB already has authentication switched on, add an admin login so it can create the user: `--admin-uri 'mongodb://ADMIN:PASS@127.0.0.1:27017/?authSource=admin'`. After it has run, `git status` shows `scripts/db/import-live.js` as deleted — expected; `git checkout -- scripts/db/import-live.js` brings it back if you ever need it.
3. **CloudPanel:** the site must be a Node.js site with app port **3117**. `/api`, `/uploads` and `/img` are forwarded to the API by the website itself — no extra proxy rules.

## Updating later

```bash
cd /home/rentghar/htdocs/rentghar.pk
git pull
npm ci
NODE_OPTIONS=--max-old-space-size=6144 npm run build
pm2 restart rentghar-api rentghar-web
```

Do **not** run the import again on a live site with real data: it refuses unless you add `--replace`, which overwrites the live listings and accounts with the file.

## Checks

```bash
curl -s http://127.0.0.1:3118/api/cities | head -c 200          # API answers
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3117/   # website: 200
pm2 logs rentghar-api --lines 30
```

## Optional, later

- **Lock MongoDB with a password** (recommended once everything runs): add `security:\n  authorization: enabled` to `/etc/mongod.conf`, then `sudo systemctl restart mongod`. The `rentghar` user already exists, so the site keeps working. Create a MongoDB admin user for yourself before you switch it on, or you will have no admin login afterwards.
- **Google sign-in:** create an OAuth client for `https://rentghar.pk` with callback `https://rentghar.pk/api/auth/google/callback`, put the ID and secret in `apps/api/.env`, then `pm2 restart rentghar-api`.
- **AI chat / AI image features:** add your OpenAI key (`OPENAI_API_KEY` in apps/api/.env, `AI_ASSISTANT_API_KEY` in apps/web/.env); the web one needs a rebuild.
