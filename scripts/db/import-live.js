/*
 * Rent Ghar — one-time live setup: creates the MongoDB user and database,
 * loads the exported data, sets the admin login, then deletes itself.
 * Run ON THE SERVER, from the project folder:
 *
 *   node scripts/db/import-live.js --admin-email you@example.com --admin-password 'a-strong-password'
 *
 * What it does, in order:
 *   1. Reads MONGODB_URI from apps/api/.env. If the URI has a user and
 *      password in it (mongodb://rentghar:PASSWORD@127.0.0.1:27017/rentghar),
 *      that MongoDB user is created with access to that one database only
 *      (readWrite + dbAdmin). If the user already exists and the password
 *      works, it is left alone.
 *   2. Creates the database and loads deploy/rentghar-db.json.gz (made on
 *      your PC by scripts/db/export-local.js): cities, areas, listings, media
 *      library, settings, plans. Copied listings arrive as drafts.
 *   3. Sets the dashboard admin login from --admin-email / --admin-password
 *      (the local test password never reaches the live site).
 *   4. Locks apps/api/.env and apps/web/.env to the owner (chmod 600), then
 *      deletes the data file and this script, so neither the full data
 *      export nor a re-runnable import is left on the server. Pass --keep
 *      to leave both in place.
 *
 * Safety:
 *   - Refuses to touch a database that already has listings or users, unless
 *     you pass --replace (which drops the collections it is about to load).
 *   - --dry-run shows what would happen and changes nothing.
 *   - If MongoDB already has authentication switched on, the user can only be
 *     created with an admin login:
 *       --admin-uri 'mongodb://ADMIN:PASS@127.0.0.1:27017/?authSource=admin'
 *     On a fresh MongoDB install nothing extra is needed.
 *
 * Photos are not in this file: upload the uploads/ folder to
 * <project>/uploads (the API serves it at /uploads/...).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { MongoClient, BSON } = require('mongodb');
const bcrypt = require('bcrypt');

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = flag('dry-run');

function readEnvUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = path.join(ROOT, 'apps', 'api', '.env');
  const line = fs.existsSync(file) && fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='));
  return line ? line.slice('MONGODB_URI='.length).trim() : '';
}

const isAuthError = (e) => e && (e.code === 18 || /Authentication failed|auth.*fail/i.test(e.message || ''));
const isUnauthorized = (e) => e && (e.code === 13 || /requires authentication|not authorized|Unauthorized/i.test(e.message || ''));

/**
 * Step 1: make sure the MongoDB user in MONGODB_URI exists and can log in.
 * Returns the URI to read/write with — normally MONGODB_URI itself; in a dry
 * run where the user does not exist yet, the admin connection instead.
 */
async function ensureDbUser(uri, dbName) {
  const u = new URL(uri);
  const user = decodeURIComponent(u.username);
  const pwd = decodeURIComponent(u.password);
  if (!user) {
    console.log('MONGODB_URI has no user in it: connecting without a MongoDB login.');
    return uri;
  }

  try {
    const c = await MongoClient.connect(uri);
    await c.db(dbName).command({ ping: 1 });
    await c.close();
    console.log(`MongoDB user "${user}": already exists, login OK.`);
    return uri;
  } catch (e) {
    if (!isAuthError(e)) throw e;
  }

  const adminUri = opt('admin-uri') || `mongodb://${u.host}/`;
  if (DRY) {
    console.log(`would create MongoDB user "${user}" (readWrite + dbAdmin on "${dbName}")`);
    return adminUri;
  }

  const roles = [
    { role: 'readWrite', db: dbName },
    { role: 'dbAdmin', db: dbName },
  ];
  const admin = await MongoClient.connect(adminUri);
  try {
    const target = admin.db(u.searchParams.get('authSource') || dbName);
    const info = await target.command({ usersInfo: user });
    if (info.users && info.users.length) {
      await target.command({ updateUser: user, pwd, roles });
      console.log(`MongoDB user "${user}": password reset to match apps/api/.env.`);
    } else {
      await target.command({ createUser: user, pwd, roles });
      console.log(`MongoDB user "${user}": created (readWrite + dbAdmin on "${dbName}" only).`);
    }
  } catch (e) {
    if (isUnauthorized(e)) {
      console.error('\nMongoDB has authentication switched on, so the user can only be created with an admin login. Run again with:');
      console.error("  --admin-uri 'mongodb://ADMIN:PASS@127.0.0.1:27017/?authSource=admin'");
      process.exit(1);
    }
    throw e;
  } finally {
    await admin.close();
  }
  return uri;
}

/** Step 4a: only the file's owner may read the secrets files (Linux; ignored elsewhere). */
function lockEnvFiles() {
  for (const rel of ['apps/api/.env', 'apps/web/.env']) {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) continue;
    try {
      fs.chmodSync(f, 0o600);
      console.log(`Locked ${rel} (owner read/write only)`);
    } catch {
      /* Windows or a read-only mount — nothing to do */
    }
  }
}

(async () => {
  // Check everything first, so a mistake stops the script before it changes anything.
  const file = path.resolve(ROOT, opt('file') || 'deploy/rentghar-db.json.gz');
  const uri = readEnvUri();
  if (!uri) {
    console.error('MONGODB_URI is not set. Upload the live .env to apps/api/.env first.');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`Not found: ${file}\nUpload deploy/rentghar-db.json.gz from your PC first.`);
    process.exit(1);
  }
  const adminEmail = (opt('admin-email') || '').trim().toLowerCase();
  const adminPassword = opt('admin-password') || '';
  if (!DRY && (!adminEmail || adminPassword.length < 10)) {
    console.error('Pass --admin-email and --admin-password (at least 10 characters) for the live dashboard login.');
    process.exit(1);
  }
  const dbName = new URL(uri).pathname.replace(/^\//, '');
  if (!dbName) {
    console.error('MONGODB_URI has no database name (…:27017/rentghar).');
    process.exit(1);
  }

  const dump = BSON.EJSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'), { relaxed: false });
  const names = Object.keys(dump.collections);
  console.log(`Dump from ${dump.exportedAt} (${dump.database}) → ${uri.replace(/\/\/[^@]*@/, '//***@')}\n`);

  // 1. MongoDB user
  const workUri = await ensureDbUser(uri, dbName);

  // 2. Database + data
  const client = await MongoClient.connect(workUri);
  const db = client.db(dbName);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  const busy = [];
  for (const n of ['properties', 'users']) {
    if (existing.has(n) && (await db.collection(n).estimatedDocumentCount()) > 0) busy.push(n);
  }
  if (busy.length && !flag('replace') && !DRY) {
    console.error(`The live database already has data in: ${busy.join(', ')}.\nRun again with --replace to overwrite it (the collections in the dump are dropped first).`);
    await client.close();
    process.exit(1);
  }

  for (const name of names) {
    const docs = dump.collections[name];
    if (DRY) {
      console.log(`would load ${name.padEnd(20)} ${docs.length}`);
      continue;
    }
    if (existing.has(name)) await db.collection(name).drop();
    if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
    else await db.createCollection(name).catch(() => undefined);
    console.log(`loaded ${name.padEnd(20)} ${docs.length}`);
  }

  // 3. Admin login
  if (!DRY) {
    const users = db.collection('users');
    const hash = await bcrypt.hash(adminPassword, 12);
    const now = new Date();
    // The admin from the dump takes the new email/password; otherwise one is created.
    const admin = (await users.findOne({ email: adminEmail })) || (await users.findOne({ role: 'ADMIN' }));
    if (admin) {
      await users.updateOne({ _id: admin._id }, { $set: { email: adminEmail, password: hash, role: 'ADMIN', isActive: true, provider: 'credentials', updatedAt: now } });
    } else {
      await users.insertOne({ email: adminEmail, name: 'Admin', password: hash, role: 'ADMIN', isActive: true, provider: 'credentials', createdAt: now, updatedAt: now });
    }
    const drafts = await db.collection('properties').countDocuments({ status: 'draft' });
    const live = await db.collection('properties').countDocuments({ status: 'approved' });
    console.log(`\nDatabase "${dbName}" ready.`);
    console.log(`Admin login: ${adminEmail}`);
    console.log(`Listings: ${live} live, ${drafts} drafts (Dashboard → Properties → Draft to review and publish).`);
  }
  await client.close();

  // 4. Clean up: lock the secrets, remove the data file and this script, so
  // the import cannot be run again by accident and the full data export is
  // not left lying on the server.
  if (!DRY) {
    lockEnvFiles();
    if (!flag('keep')) {
      for (const f of [file, __filename]) {
        try {
          fs.unlinkSync(f);
          console.log(`Deleted ${path.relative(ROOT, f)}`);
        } catch (e) {
          console.warn(`Could not delete ${path.relative(ROOT, f)}: ${e.message}`);
        }
      }
    }
    console.log('\nNext:  pm2 start ecosystem.config.js && pm2 save   (or pm2 restart rentghar-api if it is already running)');
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
