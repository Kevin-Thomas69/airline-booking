import { MongoClient } from "mongodb";

declare global {
  var __mongoClient: MongoClient | undefined;
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise() {
  if (global.__mongoClientPromise) return global.__mongoClientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing env var: MONGODB_URI");
  }

  const client = new MongoClient(uri);
  global.__mongoClient = client;
  global.__mongoClientPromise = client.connect();
  return global.__mongoClientPromise;
}

export async function getClient() {
  return getClientPromise();
}

export async function getDb() {
  const client = await getClientPromise();
  const dbName = process.env.MONGODB_DB || "airline_booking";
  return client.db(dbName);
}
