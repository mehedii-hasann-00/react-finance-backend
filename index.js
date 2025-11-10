import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());              // If frontend and API are same Vercel domain, CORS is optional
app.use(express.json());

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("Missing env var: MONGO_URI");
}

// --- Reuse Mongo client across serverless invocations ---
let clientPromise;
if (!globalThis._mongoClientPromise) {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    maxPoolSize: 10,
  });
  globalThis._mongoClientPromise = client.connect();
}
clientPromise = globalThis._mongoClientPromise;

let collection;

async function connectDB() {
  try {
    const client = await clientPromise;
    const db = client.db("testDB");      // choose your DB name
    collection = db.collection("users"); // choose your collection name
    // Optionally seed dummy data once
    const count = await collection.countDocuments();
    if (count === 0) {
      await collection.insertMany([
        { name: "Alice Johnson", email: "alice@example.com", age: 25, city: "New York" },
        { name: "Bob Smith", email: "bob@example.com", age: 30, city: "London" },
        { name: "Charlie Brown", email: "charlie@example.com", age: 28, city: "Toronto" },
        { name: "Diana Adams", email: "diana@example.com", age: 27, city: "Berlin" },
        { name: "Ethan Lee", email: "ethan@example.com", age: 32, city: "Tokyo" },
      ]);
      console.log("🌱 Inserted dummy users!");
    }
    console.log("✅ MongoDB Ready");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
// Kick off once at cold start
await connectDB();

// Health check
app.get("/", (_req, res) => {
  res.send("Hello from Express + MongoDB Native Driver (Vercel)!");
});

// -----------------------------
// 🟩 CRUD Routes
// -----------------------------

app.get("/users/email/:email", async (req, res) => {
  try {
    const user = await collection.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user by email" });
  }
});

app.post("/transactions", async (req, res) => {
  try {
    const result = await collection.insertOne(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// CREATE
app.post("/users", async (req, res) => {
  try {
    const result = await collection.insertOne(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// READ (all)
app.get("/users", async (_req, res) => {
  try {
    const users = await collection.find().toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// READ (single)
app.get("/users/:id", async (req, res) => {
  try {
    const user = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// UPDATE
app.put("/users/:id", async (req, res) => {
  try {
    const update = { $set: req.body };
    const result = await collection.updateOne({ _id: new ObjectId(req.params.id) }, update);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE
app.delete("/users/:id", async (req, res) => {
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ❗️Vercel serverless: export the handler (do NOT app.listen)
export default app;
