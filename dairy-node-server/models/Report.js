const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: { type: String, required: true },
    reportDate: { type: Date, required: true },
    dataJson: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
