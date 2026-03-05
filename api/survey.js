const { MongoClient } = require('mongodb');

// Get the MongoDB URI from environment variables
const uri = process.env.MONGO_URI;

// Set up the MongoClient instance without deprecated options
let client;
let clientPromise;

if (!process.env.MONGO_URI) {
    throw new Error('Please add your Mongo URI to environment variables');
}

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

// Allow CORS for Vercel
const allowCors = fn => async (req, res) => {
    const origin = req.headers.origin;

    // Set CORS headers
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    return await fn(req, res);
};

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const databaseClient = await clientPromise;
        const database = databaseClient.db('surveyDB');
        const collection = database.collection('responses');

        const data = req.body || {};

        // Add timestamp to the document
        const documentToInsert = {
            ...data,
            timestamp: new Date()
        };

        const result = await collection.insertOne(documentToInsert);

        return res.status(200).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        console.error('Error saving survey response:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = allowCors(handler);