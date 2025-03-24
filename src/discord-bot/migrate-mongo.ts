import { Db, Document, MongoClient, OptionalUnlessRequiredId } from "mongodb";
import dotenv from "dotenv";
import { BadgeAsset, NominationThread, NominationVote, Transaction } from "@/types/discord-bot";
import { SCFUser, UserRoleDoc } from "./types";
import { BadgeHolder } from "@/lib/stellarQuest";

dotenv.config();
const MIGRATE_MONGO = process.env.MIGRATE_MONGO_TO_MONGO || false;
const getSafeUri = (uri: string): string => {
  try {
    // Extract just the hostname:port part, hiding credentials
    const url = new URL(uri);
    return `${url.protocol}//${url.host}`;
  } catch (err) {
    return `Invalid URI format ${err}`;
  }
};
// Load environment variables
const OLD_MONGO_URI = process.env.OLD_MONGO_URI || "";
const NEW_MONGO_URI = process.env.NEW_MONGO_URI || "";
const OLD_DB_NAME = process.env.OLD_DB_NAME || "";
const NEW_DB_NAME = process.env.NEW_DB_NAME || "";

if (!OLD_MONGO_URI || !NEW_MONGO_URI || !OLD_DB_NAME || !NEW_DB_NAME) {
  console.error("Missing environment variables. Check your .env file.");
  process.exit(1);
}

// Function to migrate a database
export async function migrateMongoDatabasetoMongo() {
  const oldClient = new MongoClient(OLD_MONGO_URI);
  const newClient = new MongoClient(NEW_MONGO_URI);
  /*
  This function migrates the old databases to the new database. 
  the new collection structure is:
  SCF_Users: holds the user interactions and data
  BadgeHolders: holds the badge holders
  badges: holds the badges
  transactions: holds the transactions
  nomination_votes: holds the nomination votes
  nomination_threads: holds the nomination threads
  guild_roles: holds the guild roles
  */
  try {
    if (globalThis.migrationran) {
      return;
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - Connecting to old database at ${OLD_MONGO_URI}...`);
    await oldClient.connect();
    console.log(`[migrateMongoToMongo] [${Date.now()}] - Connecting to new database at ${NEW_MONGO_URI}...`);
    await newClient.connect();
    const _scfusersDb = oldClient.db("stellarDB");
    const oldDb = oldClient.db(OLD_DB_NAME);
    const newDb = newClient.db(NEW_DB_NAME);
    // Make a call to each database so the vars aren't unused if the comments are in place. shutup linter!
    // Log DB information and collection counts
    const logDatabaseInfo = async () => {
      console.log(`[Migrate] DB Servers: Old=${getSafeUri(OLD_MONGO_URI)}, New=${getSafeUri(NEW_MONGO_URI)}`);
      console.log("[Migrate] Starting migration...");
      console.log(`[Migrate] Migration is ${MIGRATE_MONGO ? "enabled" : "disabled"}, continuing with ${MIGRATE_MONGO ? "migration" : "no migration"}`);
      const dbs = [
        { db: oldDb, name: `Old DB "${OLD_DB_NAME}"` },
        { db: newDb, name: `New DB "${NEW_DB_NAME}"` },
        { db: _scfusersDb, name: `Old Db: ${process.env.oldStellarDb || "StellarDB"}` },
      ];

      for (const { db, name } of dbs) {
        const collections = await db.collections();
        console.log(`[Migrate] ${name} has ${collections.length} collections:`);

        for (const coll of collections) {
          const count = await db.collection(coll.collectionName).countDocuments();
          console.log(`   - ${coll.collectionName}: ${count} docs`);
        }
      }
    };

    await logDatabaseInfo();
    // guild_roles isn't migrated since it can be ingested from discord easier and holds no app specific info in the old version.
    if (MIGRATE_MONGO) {
      // SCF_Users migration
      await migrateCollection<SCFUser>(_scfusersDb, newDb, {
        oldCollectionName: "SCF_Users",
        newCollectionName: "SCF_Users",
        docType: "users",
      });

      // BadgeHolders migration
      await migrateCollection<BadgeHolder>(_scfusersDb, newDb, {
        oldCollectionName: "BadgeHolders",
        newCollectionName: "BadgeHolders",
        docType: "holders",
      });

      // Badges migration
      await migrateCollection<BadgeAsset>(_scfusersDb, newDb, {
        oldCollectionName: "badges",
        newCollectionName: "badges",
        docType: "badges",
      });

      // Transactions migration
      await migrateCollection<Transaction>(_scfusersDb, newDb, {
        oldCollectionName: "transactions",
        newCollectionName: "transactions",
        docType: "transactions",
      });

      // Nomination votes migration
      await migrateCollection<NominationVote>(oldDb, newDb, {
        oldCollectionName: "votes",
        newCollectionName: "nomination_votes",
        docType: "votes",
      });

      // Nomination threads migration
      await migrateCollection<NominationThread>(oldDb, newDb, {
        oldCollectionName: "voting_threads",
        newCollectionName: "nomination_threads",
        docType: "threads",
      });

      // User roles migration
      await migrateCollection<UserRoleDoc>(oldDb, newDb, {
        oldCollectionName: "user_roles",
        newCollectionName: "user_roles",
        docType: "roles",
      });

      // Set global var to indicate migration completed
      globalThis.migrationran = true;

      console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Database migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

export async function migrateCollection<T extends Document>(
  oldDb: Db,
  newDb: Db,
  options: {
    oldCollectionName: string;
    newCollectionName: string;
    docType: string;
    batchSize?: number;
  },
): Promise<void> {
  const { oldCollectionName, newCollectionName, docType, batchSize = 5000 } = options;

  const oldCollection = oldDb.collection<T>(oldCollectionName);
  const newCollection = newDb.collection<T>(newCollectionName);

  const cursor = oldCollection.find();
  let batch: OptionalUnlessRequiredId<T>[] = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (doc) {
      // Convert WithId<T> to OptionalUnlessRequiredId<T> to make TypeScript happy
      const docToInsert = { ...doc } as unknown as OptionalUnlessRequiredId<T>;
      batch.push(docToInsert);
      if (batch.length >= batchSize) {
        await newCollection.insertMany(batch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} ${docType} documents`);
        batch = [];
      }
    }
  }

  // Insert remaining documents
  if (batch.length > 0) {
    await newCollection.insertMany(batch);
    console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} final ${docType} documents`);
  }

  console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ ${docType} migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
}
