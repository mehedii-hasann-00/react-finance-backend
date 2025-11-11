import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


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
    const db = client.db("testDB"); // Replace with your actual DB name
    collection = db.collection("users"); // Replace with your collection name
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err; // Make sure to throw the error if the connection fails
  }
}


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
    req.token_email = user.email;
    next();
  } catch {
    return res.status(401).send("msg : Unauth access");
  }
};

app.get("/", (req, res) => {
  res.send("Hello from Express + MongoDB Native Driver!");
});


// -----------------------------
// 🟩 CRUD Routes
// -----------------------------


async function init() {
  await connectDB();

  app.post("/transactions", verify_user, async (req, res) => {
    console.log("headers", req.headers);
    console.log("data ----", req.body);

    if (req.headers.email !== req.token_email) {
      return res.status(403).send({ msg: 'Forbidden' });
    }

    if (Object.keys(req.body).length > 0) {
      if (!collection) {
        return res.status(500).json({ error: "Database not connected" });  // Ensure collection is initialized
      }
      try {
        const result = await collection.insertOne(req.body);
        console.log(result.insertedId);
        return res.status(201).json(result);
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to create transaction" });
      }
    }

    return res.status(400).json({ error: "Request body is empty" });
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

  // READ
  app.get("/get-data", verify_user, async (req, res) => {
    if (req.headers.email !== req.token_email) {
      return res.status(403).send({ msg: 'Forbidden' });
    }

    if (!collection) {
      return res.status(500).json({ error: "Database not connected" });  // Ensure collection is initialized
    }
    try {
      const query = { email: req.headers.email };
      const data = await collection.find(query).toArray();
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to get user data" });
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

}


// -----------------------------
init().then(() => {
  const PORT = process.env.PORT || 5001;  // Ensure port is defined
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => {
  console.error("Server failed to start due to database connection issue:", err);
});



