require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const connectDB = async () => {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
};


module.exports = { connectDB, redis }; // Exporting both