const mongoose = require('./dairy-node-server/node_modules/mongoose');

const uri = 'mongodb+srv://gajananmagar004_db_user:OJgp4EnQLg7tsvYa@cluster0.eobdyd7.mongodb.net/dairy_db?appName=Cluster0';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const userId = '8149101048';
  const customerName = 'तायनाक सर';
  const customer = await db.collection('customers').findOne({ userId, name: customerName });

  if (!customer) {
    console.log('CUSTOMER_NOT_FOUND');
    return;
  }

  console.log('CUSTOMER', JSON.stringify({
    id: String(customer._id),
    name: customer.name,
    balance: customer.balance,
    userId: customer.userId,
  }));

  const payments = await db.collection('payments')
    .find({ userId, customerId: String(customer._id) })
    .sort({ paymentDate: -1, createdAt: -1 })
    .toArray();

  console.log('PAYMENTS');
  for (const payment of payments) {
    console.log(JSON.stringify({
      id: String(payment._id),
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paidFromDate: payment.paidFromDate,
      paidToDate: payment.paidToDate,
      method: payment.paymentMethod,
      status: payment.status,
    }));
  }

  const entries = await db.collection('milk_entries')
    .find({
      userId,
      customerId: String(customer._id),
      date: {
        $gte: new Date('2026-05-09T00:00:00.000Z'),
        $lte: new Date('2026-05-12T23:59:59.999Z'),
      },
    })
    .sort({ date: 1 })
    .toArray();

  console.log('ENTRIES_9_TO_12');
  for (const entry of entries) {
    console.log(JSON.stringify({
      id: String(entry._id),
      date: entry.date,
      morningQuantity: entry.morningQuantity,
      eveningQuantity: entry.eveningQuantity,
      totalAmount: entry.totalAmount,
    }));
  }

  const paidDates = new Set();
  for (const payment of payments) {
    if (payment.paidFromDate && payment.paidToDate) {
      const start = new Date(payment.paidFromDate);
      const end = new Date(payment.paidToDate);
      for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        paidDates.add(cursor.toISOString().slice(0, 10));
      }
    }
  }

  const included = [];
  const excluded = [];
  let total = 0;

  for (const entry of entries) {
    const key = new Date(entry.date).toISOString().slice(0, 10);
    if (paidDates.has(key)) {
      excluded.push(key);
      continue;
    }
    included.push({ date: key, totalAmount: entry.totalAmount });
    total += Number(entry.totalAmount?.$numberDecimal || entry.totalAmount || 0);
  }

  console.log('PAID_DATES', JSON.stringify([...paidDates].sort()));
  console.log('EXCLUDED_FROM_NEW_BILL', JSON.stringify(excluded));
  console.log('INCLUDED_IN_NEW_BILL', JSON.stringify(included));
  console.log('EXPECTED_NEW_BILL_TOTAL', total);

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
