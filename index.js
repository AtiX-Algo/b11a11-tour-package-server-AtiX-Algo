const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-live-client-site.web.app'], // Add your deployed client URL
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.MONGO_URI}`;

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
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
  try {
    // await client.connect(); // Connect on first operation

    const packagesCollection = client.db("tourDB").collection("tourPackages");
    const bookingsCollection = client.db("tourDB").collection("bookings");

    // --- JWT API ---
    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
    });

    // --- Packages API ---

    // GET all packages (with search)
    app.get('/packages', async (req, res) => {
        let query = {};
        if (req.query?.search) {
            query = { tour_name: { $regex: req.query.search, $options: 'i' } };
        }
        const result = await packagesCollection.find(query).toArray();
        res.send(result);
    });
    
    // GET featured packages (limit 6)
    app.get('/packages-featured', async (req, res) => {
        const result = await packagesCollection.find().limit(6).toArray();
        res.send(result);
    });

    // GET a single package by ID
    app.get('/packages/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await packagesCollection.findOne(query);
        res.send(result);
    });

    // POST a new package (Protected)
    app.post('/packages', verifyToken, async (req, res) => {
        const packageData = req.body;
        const result = await packagesCollection.insertOne(packageData);
        res.send(result);
    });

    // GET packages by guide email (Protected)
    app.get('/my-packages/:email', verifyToken, async (req, res) => {
        if (req.decoded.email !== req.params.email) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        const email = req.params.email;
        const query = { guide_email: email };
        const result = await packagesCollection.find(query).toArray();
        res.send(result);
    });
    
    // PUT (Update) a package (Protected)
    app.put('/packages/:id', verifyToken, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedPackage = req.body;
        const packageDoc = {
            $set: {
                tour_name: updatedPackage.tour_name,
                image: updatedPackage.image,
                duration: updatedPackage.duration,
                departure_location: updatedPackage.departure_location,
                destination: updatedPackage.destination,
                price: updatedPackage.price,
                departure_date: updatedPackage.departure_date,
                package_details: updatedPackage.package_details,
                guide_contact_no: updatedPackage.guide_contact_no
            }
        }
        const result = await packagesCollection.updateOne(filter, packageDoc, options);
        res.send(result);
    });


    // DELETE a package (Protected)
    app.delete('/packages/:id', verifyToken, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await packagesCollection.deleteOne(query);
        res.send(result);
    });

    // --- Bookings API ---

    // POST a new booking (Protected) and increment count
    app.post('/bookings', verifyToken, async (req, res) => {
        const booking = req.body;
        
        // 1. Insert into bookings collection
        const bookingResult = await bookingsCollection.insertOne(booking);

        // 2. Increment bookingCount in the corresponding tourPackage
        const updateDoc = { $inc: { bookingCount: 1 } };
        const packageQuery = { _id: new ObjectId(booking.tour_id) };
        const packageUpdateResult = await packagesCollection.updateOne(packageQuery, updateDoc);

        res.send({ bookingResult, packageUpdateResult });
    });

    // GET bookings by user email (Protected)
    app.get('/my-bookings/:email', verifyToken, async (req, res) => {
        if (req.decoded.email !== req.params.email) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        const email = req.params.email;
        const query = { buyer_email: email };
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
    });

    // PATCH (Update) booking status (Protected)
    app.patch('/bookings/:id', verifyToken, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: {
                status: req.body.status
            }
        }
        const result = await bookingsCollection.updateOne(filter, updatedDoc);
        res.send(result);
    });


    // Ping to confirm successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Tour Package Server is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});