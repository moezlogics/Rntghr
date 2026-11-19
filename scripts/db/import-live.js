/*
 * Rent Ghar — create the live database and load the exported data into it.
 * Run ON THE SERVER, from the project folder:
 *
 *   node scripts/db/import-live.js --admin-email you@example.com --admin-password 'a-strong-password'
 *
 * Reads MONGODB_URI from apps/api/.env and deploy/rentghar-db.json.gz (made
 * on your PC by scripts/db/export-local.js). MongoDB creates the database the
 * moment the first document is written, so there is nothing to set up first.
 *
 * Safety:
 *   - Refuses to touch a database that already has listings or users, unless
 *     you pass --replace (which drops the collections it is about to load).
 *   - --admin-email / --admin-password set the dashboard login for the
 *     admin account that comes across (or create it): the local test
 *     password never reaches the live site.
 *   - --dry-run shows what would be loaded and changes nothing.
 *   - After a successful import the script deletes itself and the data file
 *     (deploy/rentghar-db.json.gz), so neither is left on the server. Pass
 *     --keep to leave both in place.
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

function readEnvUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = path.join(ROOT, 'apps', 'api', '.env');
  const line = fs.existsSync(file) && fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='));
  return line ? line.slice('MONGODB_URI='.length).trim() : '';
}

(async () => {
  const file = path.resolve(ROOT, opt('file') || 'deploy/rentghar-db.json.gz');
  const uri = readEnvUri();
  if (!uri) {
    console.error('MONGODB_URI is not set (apps/api/.env). Copy the live api.env there first.');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`Not found: ${file}\nUpload deploy/rentghar-db.json.gz from your PC first.`);
    process.exit(1);
  }
  const adminEmail = (opt('admin-email') || '').trim().toLowerCase();
  const adminPassword = opt('admin-password') || '';
  if (!flag('dry-run') && (!adminEmail || adminPassword.length < 10)) {
    console.error('Pass --admin-email and --admin-password (at least 10 characters) for the live dashboard login.');
    process.exit(1);
  }

  const dump = BSON.EJSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'), { relaxed: false });
  const names = Object.keys(dump.collections);
  console.log(`Dump from ${dump.exportedAt} (${dump.database}) → ${uri.replace(/\/\/[^@]*@/, '//***@')}`);

  const client = await MongoClient.connect(uri);
  const db = client.db();
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  const busy = [];
  for (const n of ['properties', 'users']) {
    if (existing.has(n) && (await db.collection(n).estimatedDocumentCount()) > 0) busy.push(n);
  }
  if (busy.length && !flag('replace') && !flag('dry-run')) {
    console.error(`The live database already has data in: ${busy.join(', ')}.\nRun again with --replace to overwrite it (the collections in the dump are dropped first).`);
    await client.close();
    process.exit(1);
  }

  for (const name of names) {
    const docs = dump.collections[name];
    if (flag('dry-run')) {
      console.log(`would load ${name.padEnd(20)} ${docs.length}`);
      continue;
    }
    if (existing.has(name)) await db.collection(name).drop();
    if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
    else await db.createCollection(name).catch(() => undefined);
    console.log(`loaded ${name.padEnd(20)} ${docs.length}`);
  }

  if (!flag('dry-run')) {
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
    console.log(`\nAdmin login: ${adminEmail}`);
    console.log(`Listings: ${live} live, ${drafts} drafts (Dashboard → Properties → Draft to review and publish).`);
    console.log('Restart the API so it builds its indexes:  pm2 restart rentghar-api');
  }
  await client.close();

  // Done: remove the data file and this script, so the import cannot be run
  // again by accident and the full data export is not left lying on the server.
  if (!flag('dry-run') && !flag('keep')) {
    for (const f of [file, __filename]) {
      try {
        fs.unlinkSync(f);
        console.log(`Deleted ${path.relative(ROOT, f)}`);
      } catch (e) {
        console.warn(`Could not delete ${path.relative(ROOT, f)}: ${e.message}`);
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
