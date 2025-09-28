// In tourtrek-server/index.js

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-live-client-site.web.app'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wknmybf.mongodb.net/tourDB?retryWrites=true&w=majority&appName=Cluster0`;
console.log("MongoDB URI:", uri); // 👈 Check if DB_USER and DB_PASS are correct

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("Auth Header:", authHeader);
    if (!authHeader) return res.status(401).send({ message: 'unauthorized access' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          console.error("JWT Verify Error:", err.message);
          return res.status(401).send({ message: 'unauthorized access' });
        }
        console.log("Decoded JWT:", decoded);
        req.decoded = decoded;
        next();
    });
};

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect(); 
    console.log("✅ Connected to MongoDB");

    const db = client.db("tourDB");
    const packagesCollection = db.collection("tourPackages");
    const bookingsCollection = db.collection("bookings");
    const usersCollection = db.collection("users");

    // --- JWT API ---
    app.post('/jwt', async (req, res) => {
        console.log("JWT Request Body:", req.body);
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        console.log("Generated JWT:", token);
        res.send({ token });
    });

    // --- Users API ---
    app.post('/users', async (req, res) => {
        const user = req.body;
        console.log("📩 New user request:", user);
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        console.log("Existing user check:", existingUser);
        if (existingUser) return res.send({ message: 'user already exists', insertedId: null });

        const result = await usersCollection.insertOne({
            ...user,
            role: 'user'
        });
        console.log('✅ User inserted with _id:', result.insertedId);
        res.send(result);
    });

    // --- Packages API ---
    
    // 🔽🔽 ADD THIS ENTIRE BLOCK 🔽🔽
    // PACKAGES: Get featured packages for home page
    app.get('/packages-featured', async (req, res) => {
        try {
          const result = await packagesCollection.find().limit(6).toArray();
          res.send(result);
        } catch (err) {
          console.error("❌ Error fetching featured packages:", err.message);
          res.status(500).send({ error: err.message });
        }
    });
    // 🔼🔼 ADD THIS ENTIRE BLOCK 🔼🔼

    app.post('/packages', verifyToken, async (req, res) => {
        console.log("📦 New package request:", req.body);
        try {
          const packageData = req.body;
          const result = await packagesCollection.insertOne(packageData);
          console.log("✅ Package inserted with _id:", result.insertedId);
          res.send(result);
        } catch (err) {
          console.error("❌ Error inserting package:", err.message);
          res.status(500).send({ error: err.message });
        }
    });

    // --- Bookings API ---
    app.post('/bookings', verifyToken, async (req, res) => {
        console.log("📑 New booking request:", req.body);
        try {
          const booking = req.body;
          const bookingResult = await bookingsCollection.insertOne(booking);
          console.log("✅ Booking inserted with _id:", bookingResult.insertedId);
          res.send({ bookingResult });
        } catch (err) {
          console.error("❌ Error inserting booking:", err.message);
          res.status(500).send({ error: err.message });
        }
    });

  } catch (err) {
    console.error("❌ Error during setup:", err.message);
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Tour Package Server is running!');
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});
