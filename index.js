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

  app.get('/transactions/:id', verify_user, async (req, res) => {
    if (req.headers.email !== req.token_email) {
      return res.status(403).send({ msg: 'Forbidden' });
    }
    const { id } = req.params;

    try {

      const transaction = await collection.findOne({ _id: new ObjectId(id) });
      console.log(transaction)
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.status(200).json(transaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  });


  // CREATE
  app.post("/users", verify_user, async (req, res) => {
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
  app.put("/update/:id", verify_user, async (req, res) => {
    if (req.headers.email !== req.token_email) {
      return res.status(403).send({ msg: 'Forbidden' });
    }
    try {
      // The update operation: this will update fields in the transaction
      const update = { $set: req.body };

      // The updateOne operation: 
      // It looks for a transaction where _id matches the provided id and updates it with the new data
      const result = await collection.updateOne(
        { _id: new ObjectId(req.params.id) }, // Find transaction by _id
        update // Apply the update to the document
      );

      // Respond with the result of the update operation
      res.json(result);
    } catch (error) {
      // Catch any errors that occur and send a 500 status with an error message
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });


  // DELETE
  app.delete("/users/:id", verify_user, async (req, res) => {
    if (req.headers.email !== req.token_email) {
      return res.status(403).send({ msg: 'Forbidden' });
    }
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



