/*
 * Rent Ghar — local development data. NEVER for a live database.
 *
 *   npm run seed:local            (uses apps/api/.env → MONGODB_URI)
 *
 * Creates a local admin account and a starter set of cities (with their local
 * /uploads/cities/<slug>.jpg thumbnails) and areas, so the dashboard and
 * "List a rental" work on a fresh database. It refuses to run against anything
 * that is not a MongoDB on this machine. Safe to run again: everything is an
 * upsert, and the admin password is reset to the one below.
 *
 * Local admin (this machine only — change it before going live):
 */
const LOCAL_ADMIN = { email: 'admin@rentghar.local', password: 'RentGhar-local-2026!', name: 'Admin' };

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

function readEnvUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const file = path.join(__dirname, '..', 'apps', 'api', '.env');
  const line = fs.existsSync(file) && fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='));
  return line ? line.slice('MONGODB_URI='.length).trim() : '';
}

const uri = readEnvUri();
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/[\w-]+$/.test(uri)) {
  console.error(`Refusing: MONGODB_URI must be a local database (mongodb://localhost:27017/<name>). Got: ${uri ? uri.replace(/\/\/.*@/, '//***@') : '(empty)'}`);
  process.exit(1);
}

/** Starter cities and well-known areas in each (more can be added from the dashboard). */
const CITIES = {
  Lahore: { state: 'Punjab', areas: ['dha phase 5', 'dha phase 6', 'johar town', 'model town', 'gulberg', 'bahria town', 'wapda town', 'iqbal town', 'cantt', 'valencia town'] },
  Karachi: { state: 'Sindh', areas: ['dha phase 6', 'gulshan-e-iqbal', 'clifton', 'north nazimabad', 'bahadurabad', 'gulistan-e-jauhar', 'bahria town karachi', 'pechs'] },
  Islamabad: { state: 'Islamabad Capital Territory', areas: ['g-11', 'f-10', 'f-11', 'e-11', 'i-8', 'bahria enclave', 'dha phase 2', 'g-13', 'b-17'] },
  Rawalpindi: { state: 'Punjab', areas: ['bahria town phase 8', 'bahria town phase 7', 'satellite town', 'saddar', 'chaklala scheme 3', 'adiala road'] },
  Faisalabad: { state: 'Punjab', areas: ['madina town', 'peoples colony no 1', 'd ground', 'canal road', 'eden garden', 'citi housing'] },
  Multan: { state: 'Punjab', areas: ['bosan road', 'gulgasht colony', 'dha multan', 'shah rukn-e-alam colony', 'wapda town', 'buch executive villas'] },
  Peshawar: { state: 'Khyber Pakhtunkhwa', areas: ['hayatabad', 'university road', 'warsak road', 'dha peshawar', 'regi model town', 'gulbahar'] },
  Gujranwala: { state: 'Punjab', areas: ['citi housing', 'dc colony', 'master city', 'wapda town', 'satellite town', 'model town'] },
  Sialkot: { state: 'Punjab', areas: ['citi housing', 'cantt', 'kashmir road', 'model town', 'defence road'] },
  Hyderabad: { state: 'Sindh', areas: ['qasimabad', 'latifabad', 'autobahn road', 'citizen colony', 'kohsar'] },
  Quetta: { state: 'Balochistan', areas: ['jinnah town', 'samungli road', 'airport road', 'shahbaz town', 'satellite town'] },
  Bahawalpur: { state: 'Punjab', areas: ['dha bahawalpur', 'model town a', 'satellite town', 'shadab colony', 'yazman road'] },
  Sargodha: { state: 'Punjab', areas: ['satellite town', 'university road', 'faisalabad road', 'paf road', 'royal orchard'] },
  Sahiwal: { state: 'Punjab', areas: ['farid town', 'jeewan city', 'pakpattan road', 'high street', 'fateh sher colony'] },
  Abbottabad: { state: 'Khyber Pakhtunkhwa', areas: ['habibullah colony', 'mandian', 'jinnahabad', 'pma road', 'bilal town'] },
  Sukkur: { state: 'Sindh', areas: ['military road', 'shikarpur road', 'sukkur township', 'queens road', 'barrage colony'] },
};

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();
  const now = new Date();

  const admin = await db.collection('users').findOneAndUpdate(
    { email: LOCAL_ADMIN.email },
    {
      $set: { email: LOCAL_ADMIN.email, name: LOCAL_ADMIN.name, role: 'ADMIN', isActive: true, provider: 'credentials', password: await bcrypt.hash(LOCAL_ADMIN.password, 10), updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  let areaCount = 0;
  for (const [name, info] of Object.entries(CITIES)) {
    const citySlug = slug(name);
    const city = await db.collection('cities').findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          areaSlug: citySlug,
          state: info.state,
          country: 'Pakistan',
          thumbnail: `/uploads/cities/${citySlug}.jpg`,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );
    const cityId = city._id ?? city.value?._id;
    for (const a of info.areas) {
      await db.collection('areas').updateOne(
        { areaSlug: slug(a), city: cityId },
        { $set: { name: a, areaSlug: slug(a), city: cityId, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      areaCount++;
    }
  }

  console.log(`Database: ${uri}`);
  console.log(`Cities: ${Object.keys(CITIES).length}, areas: ${areaCount}`);
  console.log(`Local admin: ${LOCAL_ADMIN.email} (password: see LOCAL_ADMIN in scripts/seed-local.js) — id ${admin._id ?? admin.value?._id}`);
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
