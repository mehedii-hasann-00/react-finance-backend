import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());




// import admin from "firebase-admin";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// import fs from "fs";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const serviceAccountPath = `${__dirname}/ass-10-firebase-adminsdk.json`;

// const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });


import admin from "firebase-admin";

// Load the service account from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});





const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let collection;

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

const verify_user = async (req, res, next) => {

  if (!req.headers.auth_key) {
    return res.status(401).send("msg : Unauth access");
  }
  const token = req.headers.auth_key.split(' ')[1];
  if (!token) {
    return res.status(401).send("msg : Unauth access");
  }

  try {
    const user = await admin.auth().verifyIdToken(token);
    // console.log(user);
    req.token_email = user.email;
    next();
  }
  catch {
    return res.status(401).send("msg : Unauth access");
  }


}

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


app.post("/transactions", verify_user, async (req, res) => {
  console.log("headers", req.headers)
  console.log("data ----", req.body)

  if (req.headers.email !== req.token_email) {
    return res.status(403).send({ msg: 'forbiden' });
  }
  if ( Object.keys(req.body).length >0) {
    try {
      const result = await collection.insertOne(req.body);
      console.log(result.insertedId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  }


  res.status(500).json({ error: "Failed to create user" });

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



