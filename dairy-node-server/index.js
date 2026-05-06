const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection (commented out until URI is provided)
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Dairy Node.js Server is running');
});

app.listen(PORT, () => {
    console.log(`Node server is running on port: ${PORT}`);
});
