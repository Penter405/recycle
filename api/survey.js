import { MongoClient } from "mongodb";

let client;

export default async function handler(req, res) {

    if (req.method !== "POST") {
        res.status(405).end();
        return;
    }

    if (!client) {
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
    }

    const db = client.db("surveyDB");

    const data = req.body;

    data.time = new Date();

    await db.collection("responses").insertOne(data);

    res.json({ success: true });

}