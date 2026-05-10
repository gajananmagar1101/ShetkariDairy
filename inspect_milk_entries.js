const mongoose = require('./dairy-node-server/node_modules/mongoose');

const uri = 'mongodb+srv://gajananmagar004_db_user:OJgp4EnQLg7tsvYa@cluster0.eobdyd7.mongodb.net/dairy_db?appName=Cluster0';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db.collection('users')
    .find({}, { projection: { email: 1, name: 1, role: 1, phone: 1, googleId: 1 } })
    .limit(20)
    .toArray();

  console.log('USERS');
  for (const user of users) {
    console.log(JSON.stringify(user));
  }

  const candidateUsers = await db.collection('users')
    .find({ name: /gajanan/i }, { projection: { _id: 1, email: 1, name: 1 } })
    .toArray();

  for (const targetUser of candidateUsers) {
    console.log('TARGET_USER', JSON.stringify(targetUser));

    const userId = String(targetUser._id);
    const customers = await db.collection('customers')
      .find({ userId }, { projection: { name: 1, isActive: 1, stoppedAt: 1, skippedDates: 1, balance: 1 } })
      .limit(50)
      .toArray();

    console.log('CUSTOMER_COUNT', customers.length);
    for (const customer of customers) {
      console.log(JSON.stringify(customer));
    }

    const milkEntries = await db.collection('milk_entries')
      .find(
        { userId, date: { $gte: new Date('2026-05-09T00:00:00.000Z'), $lte: new Date('2026-05-11T23:59:59.999Z') } },
        { projection: { customerId: 1, date: 1, morningQuantity: 1, eveningQuantity: 1, totalAmount: 1 } }
      )
      .sort({ date: 1 })
      .toArray();

    console.log('MILK_ENTRY_COUNT', milkEntries.length);
    for (const entry of milkEntries) {
      console.log(JSON.stringify(entry));
    }
  }

  const allCustomers = await db.collection('customers')
    .find({}, { projection: { name: 1, userId: 1, isActive: 1, stoppedAt: 1, skippedDates: 1, balance: 1 } })
    .limit(50)
    .toArray();
  console.log('ALL_CUSTOMERS_SAMPLE');
  for (const customer of allCustomers) {
    console.log(JSON.stringify(customer));
  }

  const allMilkEntries = await db.collection('milk_entries')
    .find({}, { projection: { userId: 1, customerId: 1, date: 1, morningQuantity: 1, eveningQuantity: 1, totalAmount: 1 } })
    .sort({ date: -1 })
    .limit(50)
    .toArray();
  console.log('ALL_MILK_ENTRIES_SAMPLE');
  for (const entry of allMilkEntries) {
    console.log(JSON.stringify(entry));
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
  }
  process.exit(1);
});
