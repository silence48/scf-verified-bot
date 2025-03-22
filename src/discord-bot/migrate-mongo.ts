import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

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
  //guild_roles: holds the guild roles
  */
  try {
    if(globalThis.migrationran){
      return;
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - Connecting to old database at ${OLD_MONGO_URI}...`);
    await oldClient.connect();
    console.log(`[migrateMongoToMongo] [${Date.now()}] - Connecting to new database at ${NEW_MONGO_URI}...`);
    await newClient.connect();

    const oldDb = oldClient.db(OLD_DB_NAME);
    const newDb = newClient.db(NEW_DB_NAME);

    /* SCF_Users migration */
    const scfusersDb = oldClient.db("stellarDB");

    /*
    const oldusers = scfusersDb.collection("SCF_Users");
    const newusers = newDb.collection("SCF_Users");


    const scfucursor = oldusers.find();
    const BATCH_SIZE = 5000; // Adjust batch size for performance
    let batch: any[] = [];
    while (await scfucursor.hasNext()) {
      const doc = await scfucursor.next();
      if (doc) {
        batch.push(doc);
        if (batch.length >= BATCH_SIZE) {
          await newusers.insertMany(batch);
          console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} users documents`);
          batch = [];
        }
      }
    }

    // Insert remaining documents
    if (batch.length > 0) {
      await newusers.insertMany(batch);
      console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} final SCF_Users documents`);
    }
      
*/
    /* BadgeHolders migration */
    /*
    const oldholders = scfusersDb.collection("BadgeHolders");
    const newholders = newDb.collection("BadgeHolders");
    const holderscursor = oldholders.find();
    const holdersBATCH_SIZE = 5000; // Adjust batch size for performance
    let holdersbatch: any[] = [];
    while (await holderscursor.hasNext()) {
      const doc = await holderscursor.next();
        if (doc) {
            holdersbatch.push(doc);
            if (holdersbatch.length >= holdersBATCH_SIZE) {
            await newholders.insertMany(holdersbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${holdersbatch.length} holders documents`);
            holdersbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (holdersbatch.length > 0) {
        await newholders.insertMany(holdersbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${holdersbatch.length} final holders documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ BadgeHolders migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
*/
    /* badges migration */
  /*
    const oldbadges = scfusersDb.collection("badges");
    const newbadges = newDb.collection("badges");
    const badgescursor = oldbadges.find();
    const badgesBATCH_SIZE = 5000; // Adjust batch size for performance
    let badgesbatch: any[] = [];
    while (await badgescursor.hasNext()) {
      const doc = await badgescursor.next();
        if (doc) {
            badgesbatch.push(doc);
            if (badgesbatch.length >= badgesBATCH_SIZE) {
            await newbadges.insertMany(badgesbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${badgesbatch.length} badges documents`);
            badgesbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (badgesbatch.length > 0) {
        await newbadges.insertMany(badgesbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${badgesbatch.length} final badges documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Badges migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
*/
    /* transactions migration */
  /*
    const oldtx = scfusersDb.collection("transactions");
    const newtx = newDb.collection("transactions");
    const txcursor = oldtx.find();
    const txBATCH_SIZE = 5000; // Adjust batch size for performance
    let txbatch: any[] = [];
    while (await txcursor.hasNext()) {
      const doc = await txcursor.next();
        if (doc) {
            txbatch.push(doc);
            if (txbatch.length >= txBATCH_SIZE) {
            await newtx.insertMany(txbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${txbatch.length} transactions documents`);
            txbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (txbatch.length > 0) {
        await newtx.insertMany(txbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${txbatch.length} final transactions documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Transactions migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);

    // migrate votes collection
    const oldvotes = oldDb.collection("votes");
    const newvotes = newDb.collection("nomination_votes");
    const votescursor = oldvotes.find();
    const votesBATCH_SIZE = 5000; // Adjust batch size for performance
    let votesbatch: any[] = [];
    while (await votescursor.hasNext()) {
      const doc = await votescursor.next();
        if (doc) {
            votesbatch.push(doc);
            if (votesbatch.length >= votesBATCH_SIZE) {
            await newvotes.insertMany(votesbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${votesbatch.length} votes documents`);
            votesbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (votesbatch.length > 0) {
        await newvotes.insertMany(votesbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${votesbatch.length} final votes documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Votes migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
*/
    // migrate nomination threads collection
    const oldthreads = oldDb.collection("voting_threads");
    const newthreads = newDb.collection("nomination_threads");
    const threadscursor = oldthreads.find();
    const threadsBATCH_SIZE = 5000; // Adjust batch size for performance
    let threadsbatch: any[] = [];
    while (await threadscursor.hasNext()) {
      const doc = await threadscursor.next();
        if (doc) {
            threadsbatch.push(doc);
            if (threadsbatch.length >= threadsBATCH_SIZE) {
            await newthreads.insertMany(threadsbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${threadsbatch.length} threads documents`);
            threadsbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (threadsbatch.length > 0) {
        await newthreads.insertMany(threadsbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${threadsbatch.length} final threads documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Threads migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);

    /* migrate user roles */
    /*
    const oldroles = oldDb.collection("user_roles");
    const newroles = newDb.collection("user_roles");
    const rolescursor = oldroles.find();
    const rolesBATCH_SIZE = 5000; // Adjust batch size for performance
    let rolesbatch: any[] = [];
    while (await rolescursor.hasNext()) {
      const doc = await rolescursor.next();
        if (doc) {
            rolesbatch.push(doc);
            if (rolesbatch.length >= rolesBATCH_SIZE) {
            await newroles.insertMany(rolesbatch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${rolesbatch.length} roles documents`);
            rolesbatch = [];
            }
        }
    }
    // Insert remaining documents
    if (rolesbatch.length > 0) {
        await newroles.insertMany(rolesbatch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${rolesbatch.length} final roles documents`);
    }
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ User roles migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
    globalThis.migrationran = true
*/
    console.log(`[migrateMongoToMongo] [${Date.now()}] - ✅ Database migration from "${OLD_DB_NAME}" to "${NEW_DB_NAME}" completed.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

    /*
    const collections = await oldDb.listCollections().toArray();
    console.log(`[migrateMongoToMongo] [${Date.now()}] - Found ${collections.length} collections to migrate.`);

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`[migrateMongoToMongo] [${Date.now()}] - Migrating collection: ${collectionName}...`);

      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);

      // Drop the collection in the new database if it exists
      await newCollection.drop().catch(() => {}); // Ignore errors if the collection does not exist

      // Create indexes on the new collection
      const indexes = await oldCollection.indexes();
      if (indexes.length > 0) {
        await newCollection.createIndexes(indexes);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Copied indexes (${indexes.length})`);
      }

      // Copy documents in batches
      const cursor = oldCollection.find();

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (doc) {
          batch.push(doc);
          if (batch.length >= BATCH_SIZE) {
            await newCollection.insertMany(batch);
            console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} documents`);
            batch = [];
          }
        }
      }

      // Insert remaining documents
      if (batch.length > 0) {
        await newCollection.insertMany(batch);
        console.log(`[migrateMongoToMongo] [${Date.now()}] -   ✔ Inserted ${batch.length} final documents`);
      }

      console.log(`[migrateMongoToMongo] [${Date.now()}] - ✔ Finished migrating ${collectionName}.`);
    }
*/

