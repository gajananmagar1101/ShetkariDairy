const mongoose = require('./dairy-node-server/node_modules/mongoose');

const uri = 'mongodb+srv://gajananmagar004_db_user:OJgp4EnQLg7tsvYa@cluster0.eobdyd7.mongodb.net/dairy_db?appName=Cluster0';

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const customers = await db.collection('customers')
    .find({ name: /chaitanya/i }, { projection: { _id: 1, name: 1, userId: 1, balance: 1 } })
    .toArray();

  for (const customer of customers) {
    const user = await db.collection('users').findOne(
      { $or: [{ _id: customer.userId }, { email: customer.userId }, { phone: customer.userId }] },
      { projection: { _id: 1, email: 1, name: 1, phone: 1 } }
    );
    const userId = customer.userId;

    console.log('CUSTOMER', JSON.stringify({
      id: String(customer._id),
      name: customer.name,
      storedBalance: customer.balance,
      userId: customer.userId,
    }));
    console.log('USER', JSON.stringify(user));

    const payments = await db.collection('payments')
      .find({ userId, customerId: String(customer._id) })
      .sort({ paymentDate: 1, createdAt: 1 })
      .toArray();

    console.log('PAYMENTS');
    for (const payment of payments) {
      console.log(JSON.stringify({
        id: String(payment._id),
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paidFromDate: payment.paidFromDate,
        paidToDate: payment.paidToDate,
        createdAt: payment.createdAt,
      }));
    }

    const invoices = await db.collection('invoices')
      .find({ userId, customerId: String(customer._id) })
      .sort({ createdAt: 1 })
      .toArray();

    console.log('INVOICES');
    for (const invoice of invoices) {
      console.log(JSON.stringify({
        id: String(invoice._id),
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        periodStartDate: invoice.periodStartDate,
        periodEndDate: invoice.periodEndDate,
        createdAt: invoice.createdAt,
      }));
    }

    const entries = await db.collection('milk_entries')
      .find({
        userId,
        customerId: String(customer._id),
        date: {
          $gte: new Date('2026-05-09T00:00:00.000Z'),
          $lte: new Date('2026-05-11T23:59:59.999Z'),
        },
      })
      .sort({ date: 1 })
      .toArray();

    console.log('ENTRIES');
    for (const entry of entries) {
      console.log(JSON.stringify({
        id: String(entry._id),
        date: entry.date,
        totalAmount: entry.totalAmount,
      }));
    }
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
