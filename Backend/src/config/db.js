require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const logger = require('../utils/logger');

function createRedisClient() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        return new Redis('redis://127.0.0.1:6379');
    }

    const parsedUrl = new URL(redisUrl);
    const dbFromPath = parsedUrl.pathname ? Number(parsedUrl.pathname.slice(1) || '0') : 0;

    return new Redis({
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || 6379),
        username: decodeURIComponent(parsedUrl.username || 'default'),
        password: decodeURIComponent(parsedUrl.password || ''),
        db: Number.isNaN(dbFromPath) ? 0 : dbFromPath,
        tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: 3
    });
}

const redis = createRedisClient();

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
