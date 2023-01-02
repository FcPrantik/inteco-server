const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;


const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());




//From mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ukl4fvq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('bluecollar-data').collection('services');
    const planCollection = client.db('bluecollar-data').collection('plans');
    const orderCollection = client.db('bluecollar-data').collection('orders');
    const userCollection = client.db('bluecollar-data').collection('users');
    const reviewCollection = client.db('bluecollar-data').collection('reviews');

    //STRIPE PAYMENT API

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      try {
        const service = req.body;
        const price = service.price;
        const amount = price * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ['card']
        });
        res.send({ clientSecret: paymentIntent.client_secret })

      }
      catch (error) {
        res.status(500).send(error.message)
      }
    });

    //SERVICE API

    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.post('/service', async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    app.delete('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.send(result);
    });

    // REVIEW API

    app.post('/review', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    //USER API

    app.get('/user', verifyJWT, async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

    app.get('/admin/:email', async (req, res) => {
      // const email = req.params.email;
      // const user = await userCollection.findOne({ email: email })
      // const isAdmin = user.role === 'admin';
      // res.send({ admin: isAdmin })
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query)
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.send({ admin: isAdmin })
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email};
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      console.log(user);
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ result, token });
    });

    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else {
        res.status(403).send({ message: 'forbidden' })
      }
    });

    //PLAN API

    app.get('/plan', async (req, res) => {
      const query = {};
      const cursor = planCollection.find(query);
      const plans = await cursor.toArray();
      res.send(plans);
    });

    app.get('/plan/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const plan = await planCollection.findOne(query);
      res.send(plan);
    });

    //ORDER API

    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result.insertedCount > 0);
    });


    app.patch('/order/:id', (req, res) => {
      const id = req.params.id;
      orderCollection.updateOne({_id: ObjectId(id)}, {
        $set: { status: req.body.status }
      })
        .then(result => {
          res.send(result.modifiedCount > 0)
        })
    })

    app.get('/order', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      }
      else {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
    });

    app.get('/orderlist', async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

  }

  finally {

  }

}

run().catch(console.dir);












//Default API
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})