// file: src/scripts/migrations/backfill-legacy-users.ts
// Run: npm i -D tsx typescript @types/node && npm i mongodb dotenv
//      npm run migrate:users:backfill
// .env must contain: MONGO_URI=mongodb://localhost:27017/sale-management

import "dotenv/config";
import { MongoClient, Db, Collection, Document } from "mongodb";

const URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!URI) {
  console.error("❌ MONGO_URI (ou MONGODB_URI) requis. Ex: mongodb://localhost:27017/sale-management");
  process.exit(1);
}

(async () => {
  console.log("➡️  Connecting:", URI);
  const client = new MongoClient(URI);
  await client.connect();

  const db: Db = client.db(); // DB prise depuis l'URI (sale-management)
  const users: Collection<Document> = db.collection("users");

  // 0) Doublons case-insensitive (info)
  console.log("0) Scan doublons e-mails (insensible à la casse)...");
  const dups = await users
    .aggregate([
      {
        $group: {
          _id: { $toLower: "$email" },
          ids: { $addToSet: "$_id" },
          emails: { $addToSet: "$email" },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
    ])
    .toArray();
  if (dups.length) {
    console.warn(`⚠️  ${dups.length} groupe(s) en doublon par email (insensible à la casse):`);
    dups.forEach((d) => console.warn(`   key=${d._id} -> emails=${(d.emails || []).join(", ")}`));
  } else {
    console.log("   Aucun doublon détecté.");
  }

  // 1) emails -> lowercase
  console.log("1) Normalisation des emails en lowercase…");
  const r1 = await users.updateMany(
    { email: { $type: "string" }, $expr: { $ne: [{ $toLower: "$email" }, "$email"] } },
    [{ $set: { email: { $toLower: "$email" } } }],
  );
  console.log(`   matched=${r1.matchedCount}, modified=${r1.modifiedCount}`);

  // 2) isActive=true si manquant
  console.log("2) Backfill isActive=true si manquant…");
  const r2 = await users.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  console.log(`   matched=${r2.matchedCount}, modified=${r2.modifiedCount}`);

  // 3) tokenVersion=0 si manquant
  console.log("3) Backfill tokenVersion=0 si manquant…");
  const r3 = await users.updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
  console.log(`   matched=${r3.matchedCount}, modified=${r3.modifiedCount}`);

  // 4) emailVerified=true pour legacy (pas de tokens + champ manquant/null)
  console.log("4) Backfill emailVerified=true (legacy sans tokens)…");
  const r4 = await users.updateMany(
    {
      $and: [
        { $or: [{ emailVerified: { $exists: false } }, { emailVerified: null }] },
        { $or: [{ emailVerifyTokenHash: { $exists: false } }, { emailVerifyTokenHash: null }] },
        { $or: [{ emailVerifyTokenExpires: { $exists: false } }, { emailVerifyTokenExpires: null }] },
      ],
    },
    { $set: { emailVerified: true } },
  );
  console.log(`   matched=${r4.matchedCount}, modified=${r4.modifiedCount}`);

  // 5) Index unique insensible à la casse sur email
  console.log('5) Vérifie/Crée l’index unique sur "email" (case-insensitive)…');
  try {
    const desired = { locale: "en", strength: 2 };
    const indexes = await users.indexes();
    const emailIdx = indexes.find((idx) => JSON.stringify(idx.key) === JSON.stringify({ email: 1 }));
    if (emailIdx) {
      const coll: any = (emailIdx as any).collation || {};
      const sameCollation = coll.locale === desired.locale && Number(coll.strength) === Number(desired.strength);
      const isUnique = !!(emailIdx as any).unique;
      if (!sameCollation || !isUnique) {
        console.log("   Index email incompatible -> drop & recreate.");
        try {
          await users.dropIndex("email_1");
        } catch (e: any) {
          console.warn("   dropIndex warn:", e?.message || e);
        }
      } else {
        console.log('   Index déjà OK: { email:1 }, unique, collation { locale:"en", strength:2 }');
      }
    }
    const after = await users.indexes();
    const missing = !after.find(
      (idx) => JSON.stringify(idx.key) === JSON.stringify({ email: 1 }) && (idx as any).unique,
    );
    if (missing) {
      await users.createIndex({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
      console.log('   ✅ Créé: { email:1 }, unique, collation { locale:"en", strength:2 }');
    }
  } catch (e: any) {
    console.warn("   Index warn:", e?.message || e);
  }

  await client.close();
  console.log("✅ Migration terminée");
})().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
