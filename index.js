import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let collection;

// async function connectDB() {
//   try {
//     await client.connect();
//     const db = client.db("testDB");           // choose your DB name
//     collection = db.collection("guu");      // choose your collection name
//     console.log("✅ MongoDB Connected");
//   } catch (err) {
//     console.error("MongoDB connection error:", err);
//   }
// }

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("testDB");
    collection = db.collection("users");
    console.log("✅ MongoDB Connected");


  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

connectDB();

app.get("/", (req, res) => {
  res.send("Hello from Express + MongoDB Native Driver!");
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
    console.log(req.body)
    return
  try {
    const result = await collection.insertOne(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
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
app.get("/users", async (req, res) => {
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




// -----------------------------

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



