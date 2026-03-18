require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message, stack: err.stack });
});

redis.on('connect', () => {
    logger.info('Redis connection established');
});

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('MongoDB connected');
};


module.exports = { connectDB, redis }; // Exporting both
