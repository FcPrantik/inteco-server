const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;


const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());




//From mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zpktpzb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("inteco-interior").collection("services");
        const reviewCollection = client.db("inteco-interior").collection("reviews");
        const adminCollection = client.db("inteco-interior").collection("admin");
        const addBookCollection = client.db("inteco-interior").collection("orders");


        // // make admin
        app.post('/makeAdmin', (req, res) => {
            const admin = req.body;
            adminCollection.insertOne(admin)
                .then(result => {
                    res.send(result.insertedCount)
                })
        })

        // // find admin email

        app.get('/admin/:email', (req, res) => {
            const email = req.params.email
            adminCollection.find({ email: email })
            .toArray((err, document) => {
                res.send(document[0])
            })
        })

        // add new service
        app.post('/addService', (req, res) => {
            const services = req.body;
            servicesCollection.insertOne(services)
                .then(result => {
                    res.send(result.insertedCount)
                })
        })

        // all services
        app.get('/services', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        // single Service
        app.get('/service/:id', (req, res) => {
            servicesCollection.find({ _id: ObjectId(req.params.id) })
            .toArray((err, documents) => {
                res.send(documents);
            })
        })

        // Delete Service
        app.delete('/delete/:id', (req, res) => {
            servicesCollection.deleteOne({ _id: ObjectId(req.params.id) })
                .then(result => {
                    res.send(result.deletedCount > 0)
                })
        })

        // add new Review
        app.post('/addReview', (req, res) => {
            const reviews = req.body;
            reviewCollection.insertOne(reviews)
                .then(result => {
                    res.send(result.insertedCount)
                })
        })

        // all Reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // add booking orders
        app.post('/addOrder', (req, res) => {
            const orders = req.body;
            addBookCollection.insertOne(orders)
                .then(result => {
                    res.send(result.insertedCount)
                })
        })

        // all booking orders
        app.get('/orders', async (req, res) => {
            const query = {};
            const cursor = addBookCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        // user booking orders
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const order = await addBookCollection.find(query).toArray();
            return res.send(order);
        })

    }

    finally {

    }

}

run().catch(console.dir);












//Default API
app.get('/', (req, res) => {
    res.send('Database Running')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})