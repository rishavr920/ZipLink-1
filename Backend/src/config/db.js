const mongoose = require('mongoose');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
};

module.exports = { connectDB, redis }; // Exporting both