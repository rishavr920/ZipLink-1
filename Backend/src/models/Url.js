const mongoose = require('mongoose');

const UrlSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    password: { type: String },
    isOneTime: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    clicks: { type: Number, default: 0 },
    qrCode: { type: String }
}, { timestamps: true });

UrlSchema.index(
   { originalUrl: 1, isOneTime: 1, password: 1 },
   { unique: true, sparse: true }
);



const Url = mongoose.model('Url', UrlSchema);
module.exports = Url; // Explicitly export the model constant