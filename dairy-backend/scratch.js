const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('dairy_db'); // guess
  const entries = await db.collection('milkEntry').find().toArray();
  console.log(entries);
  await client.close();
}
run().catch(console.dir);
