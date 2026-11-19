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

**Before anything:** open `apps/api/.env` and replace `CHANGE_ME_DB_PASSWORD` with a password of your own — letters and numbers only. To make one: `openssl rand -hex 16`. You never type this password anywhere else; the import script creates the MongoDB user with it.

As the **site user** (`rentghar`):

```bash
cd /home/rentghar/htdocs/rentghar.pk
git clone https://github.com/moezlogics/Rntghr.git .     # first time; later just: git pull
# upload the four items in the table above, then:
npm ci
NODE_OPTIONS=--max-old-space-size=6144 npm run build
which node                                                # note this path, e.g. /home/rentghar/.nvm/versions/node/v22.x.x/bin/node
```

As **root** (it may switch MongoDB authentication off and on, which needs root):

```bash
cd /home/rentghar/htdocs/rentghar.pk
/home/rentghar/.nvm/versions/node/v22.x.x/bin/node scripts/db/import-live.js --admin-email you@example.com --admin-password 'choose-a-strong-password'
```

(Use the path `which node` printed. If the site user has sudo, `sudo env "PATH=$PATH" node scripts/db/import-live.js …` does the same.)

Back as the **site user**:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # once: run the command it prints, so PM2 starts after a reboot
```

1. **Build** needs `apps/web/.env` in place first (the website reads the API address at build time).
2. **`import-live.js`** does the whole database setup in one go:
   - **MongoDB user** `rentghar` with the password from `MONGODB_URI`, access to the `rentghar` database only. If MongoDB asks for a login and you don't know the admin password, the script switches authentication **off** in `/etc/mongod.conf`, restarts MongoDB, creates the user, switches authentication back **on** exactly as it was and restarts again (a few seconds each; other sites on the same MongoDB blink for those seconds). Even if something fails in between, the original config is put back. If you do know an admin login you can give it instead: `--admin-uri 'mongodb://ADMIN:PASS@127.0.0.1:27017/?authSource=admin'`.
   - **Database** `rentghar` with everything (cities, areas, listings, media library, settings, plans). Listings copied from other portals arrive as **drafts**: open *Dashboard → Properties → Draft*, check each one, and publish it.
   - **Dashboard login** from `--admin-email` / `--admin-password` (the local test password is never used on the live site).
   - **Clean-up:** locks `apps/api/.env` and `apps/web/.env` so only their owner can read them, then **deletes itself and `deploy/rentghar-db.json.gz`** (add `--keep` to keep them).

   `--dry-run` shows what it would do without changing anything. Run once more by mistake, it refuses (the database already has data). After it has run, `git status` shows `scripts/db/import-live.js` as deleted — expected; `git checkout -- scripts/db/import-live.js` brings it back if you ever need it.
   Afterwards: `history -c` clears the admin password from the terminal history.
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
