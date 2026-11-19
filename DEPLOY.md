# Deploying Rent Ghar to the live server

Server folder: `/home/rentghar/htdocs/rentghar.pk` · website port **3117** · API port **3118** (internal only).

## What you upload yourself (not in git)

| On your PC | Put it on the server at |
| --- | --- |
| `deploy/live-env/api.env` | `apps/api/.env` |
| `deploy/live-env/web.env.production.local` | `apps/web/.env.production.local` |
| `deploy/rentghar-db.json.gz` | `deploy/rentghar-db.json.gz` |
| `uploads/` (whole folder) | `uploads/` |

Make a fresh export before you upload, if you changed anything locally since:

```bash
npm run db:export
```

## First deploy

```bash
cd /home/rentghar/htdocs/rentghar.pk
git pull                      # or git clone <repo> .
# upload the four items in the table above, then:
npm ci
NODE_OPTIONS=--max-old-space-size=6144 npm run build
node scripts/db/import-live.js --admin-email you@example.com --admin-password 'choose-a-strong-password'
pm2 start ecosystem.config.js
pm2 save
```

- The import creates the `rentghar` database and loads everything (cities, areas, listings, media library, settings, plans). Listings copied from other portals arrive as **drafts**: open *Dashboard → Properties → Draft*, check each one, and publish it.
- `--admin-email` / `--admin-password` become the dashboard login. The local test password is never used on the live site.
- The domain must point at port **3117** (CloudPanel: Node.js site, app port 3117). `/api`, `/uploads` and `/img` are forwarded to the API by the website itself.

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
curl -s http://127.0.0.1:3118/api/cities | head -c 200    # API answers
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3117/   # website: 200
pm2 logs rentghar-api --lines 30
```

If MongoDB on the server needs a username and password, change `MONGODB_URI` in `apps/api/.env` to `mongodb://USER:PASSWORD@127.0.0.1:27017/rentghar?authSource=admin` before running the import.
