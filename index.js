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
      try {
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        console.log("Generated JWT:", token);
        res.send({ token });
      } catch (err) {
        console.error("❌ Error generating JWT:", err.message);
        res.status(500).send({ error: err.message });
      }
    });

    // --- Users API ---
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log("📩 New user request:", user);
      try {
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
      } catch (err) {
        console.error("❌ Error inserting user:", err.message);
        res.status(500).send({ error: err.message });
      }
    });

    // USERS: Get user role by email
    app.get('/users/role/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log("Role lookup for:", email);

      // Security check: ensure the token's email matches the requested email
      if (!req.decoded || req.decoded.email !== email) {
        console.warn("Forbidden access attempt. Token email:", req.decoded ? req.decoded.email : 'no decoded');
        return res.status(403).send({ message: 'forbidden access' });
      }

      try {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (user) {
          res.send({ role: user.role });
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      } catch (err) {
        console.error("❌ Error fetching user role:", err.message);
        res.status(500).send({ error: err.message });
      }
    });

    // --- Packages API ---

    // GET (Featured): Get featured packages for home page
    app.get('/packages-featured', async (req, res) => {
      try {
        const result = await packagesCollection.find().limit(6).toArray();
        res.send(result);
      } catch (err) {
        console.error("❌ Error fetching featured packages:", err.message);
        res.status(500).send({ error: err.message });
      }
    });

    // GET (Single): Get a single package by its ID
    app.get('/packages/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packagesCollection.findOne(query);
      res.send(result);
    });

    // GET (All): Get all packages (with search)
    app.get('/packages', async (req, res) => {
      let query = {};
      if (req.query.search) {
        query = { tour_name: { $regex: req.query.search, $options: 'i' } };
      }
      try {
        const result = await packagesCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("❌ Error fetching all packages:", err.message);
        res.status(500).send({ error: err.message });
      }
    });

    // GET (Guide's): Get packages for a specific guide
    app.get('/my-packages/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { guide_email: email };
      const result = await packagesCollection.find(query).toArray();
      res.send(result);
    });

    // POST: Add a new package
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

    // PUT: Update a package
    app.put('/packages/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedPackage = req.body;
      const updateDoc = {
        $set: {
          tour_name: updatedPackage.tour_name,
          image: updatedPackage.image,
          duration: updatedPackage.duration,
          price: updatedPackage.price,
          departure_date: updatedPackage.departure_date,
          package_details: updatedPackage.package_details,
          guide_contact_no: updatedPackage.guide_contact_no,
        },
      };
      const result = await packagesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // DELETE: Delete a package
    app.delete('/packages/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packagesCollection.deleteOne(query);
      res.send(result);
    });

    // --- Bookings API ---

    // BOOKINGS: Add a booking
    app.post('/bookings', verifyToken, async (req, res) => {
    console.log("📑 New booking request:", req.body);
    try {
        const booking = req.body;

        const bookingResult = await bookingsCollection.insertOne(booking);
        console.log("✅ Booking inserted with _id:", bookingResult.insertedId);

        // Logic to increment the booking count on the package
        const packageQuery = { _id: new ObjectId(booking.tour_id) };
        const updateDoc = {
            $inc: { bookingCount: 1 }
        };

        // Call update ONE time and log the result
        const updateResult = await packagesCollection.updateOne(packageQuery, updateDoc);
        console.log('Package update result:', updateResult);

        res.send({ bookingResult });

    } catch (err) {
        console.error("❌ Error inserting booking:", err.message);
        res.status(500).send({ error: err.message });
    }
});

    // BOOKINGS: Get bookings for a specific user
    app.get('/my-bookings/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { buyer_email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });


    // BOOKINGS: Update a booking's status
    app.patch('/my-bookings/:email/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedStatus = req.body;

      const updateDoc = {
        $set: {
          status: updatedStatus.status
        },
      };
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
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
