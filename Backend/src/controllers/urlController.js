const Url = require('../models/Url');
const { redis } = require('../config/db'); 
const { getNextID } = require('../config/idGenerator');
const { encode } = require('../utils/base62');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

// Get BASE_URL from environment or use default
const BASE_URL = process.env.BASE_URL || 'http://localhost';

exports.shortenUrl = async (req, res) => {
    const { longUrl, password, isOneTime, expiryHours } = req.body;

    try {
        // ✅ PRE-CHECK before generating new short code
const existing = await Url.findOne({
    originalUrl: longUrl,
    isOneTime: !!isOneTime,
    password: null
});

if (existing) {
    return res.status(200).json({
        originalUrl: existing.originalUrl,
        shortUrl: `${BASE_URL}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        qrCode: existing.qrCode,
        expiresAt: existing.expiresAt,
        isPasswordProtected: !!existing.password,
        isOneTime: existing.isOneTime,
        message: "Existing short link returned"
    });
}

        // 1. Get Unique ID using Snowflake algorithm
        // Snowflake generates IDs locally with no coordination needed
        // Each ID contains: timestamp + worker ID + sequence
        const id = await getNextID();
        const shortCode = encode(id);

        // 2. Generate QR Code using BASE_URL
        const shortUrl = `${BASE_URL}/${shortCode}`;
        const qrCode = await QRCode.toDataURL(shortUrl);

        const urlData = {
            originalUrl: longUrl,
            shortCode,
            isOneTime: !!isOneTime,
            qrCode,
            expiresAt: expiryHours ? new Date(Date.now() + expiryHours * 3600 * 1000) : null
        };

        if (password) {
            urlData.password = await bcrypt.hash(password, 10);
        }

        const newUrl = await Url.create(urlData);
        
        // 3. Cache the mapping for 1 hour if no password
        if (!password && !isOneTime) {
            const ttl = expiryHours? expiryHours * 3600 : 3600;
            await redis.set(shortCode, 
                            JSON.stringify({
                                url: longUrl,
                                isOneTime: !!isOneTime
                            }), 'EX', ttl);
        }

        logger.info('URL shortened successfully', { 
            shortCode, 
            hasPassword: !!password,
            isOneTime: !!isOneTime,
            hasExpiry: !!expiryHours
        });

        res.status(201).json({
            originalUrl: newUrl.originalUrl,
            shortUrl: shortUrl,
            shortCode: newUrl.shortCode,
            qrCode: newUrl.qrCode,
            expiresAt: newUrl.expiresAt,
            isPasswordProtected: !!password,
            isOneTime: newUrl.isOneTime
        });
    } catch (err) {
        // Handle duplicate key error (shouldn't happen with Snowflake, but safety check)
        if (err.code === 11000) {
            const existingUrl = await Url.findOne({
                                    originalUrl: longUrl,
                                    isOneTime: !!isOneTime,
                                    password: null
                                });

    
            if (!existingUrl) throw err;

            const shortUrl = `${BASE_URL}/${existingUrl.shortCode}`;

            return res.status(200).json({
                originalUrl: existingUrl.originalUrl,
                shortUrl,
                shortCode: existingUrl.shortCode,
                qrCode: existingUrl.qrCode,
                expiresAt: existingUrl.expiresAt,
                isPasswordProtected: !!existingUrl.password,
                isOneTime: existingUrl.isOneTime,
                message: "Existing short link retrieved"
            });
        }
        
        // Handle validation errors from mongoose
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation failed',
                details: Object.values(err.errors).map(e => e.message)
            });
        }
        
        logger.error('Failed to shorten URL', { 
            error: err.message, 
            stack: err.stack,
            body: req.body 
        });
        res.status(500).json({ 
            error: 'Failed to shorten URL',
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
        });
    }
};

exports.redirect = async (req, res) => {
    try {
        const { code } = req.params;

        // 1. Check Redis Cache (only for non-password protected URLs)
        const cached = await redis.get(code);
        if (cached) {
            const cach = JSON.parse(cached);
            // Update click count in background (fire and forget)
Url.updateOne({ shortCode: code }, { $inc: { clicks: 1 } })
                .catch(() => {});
            return res.redirect(cach.url);
        }

        // 2. Database Fallback
        const url = await Url.findOne({ shortCode: code });
        if (!url) {
            return res.status(404).json({ 
                error: 'Link not found',
                message: 'This shortened link does not exist or has been deleted.'
            });
        }

        // 3. Check if link has expired
        if (url.expiresAt && new Date() > url.expiresAt) {
            await Url.deleteOne({ _id: url._id });
            await redis.del(code);
            return res.status(410).json({ 
                error: 'Link expired',
                message: 'This shortened link has expired.'
            });
        }

        // 4. Password Check - Return structured response for frontend to handle
        if (url.password) {
            return res.status(403).json({ 
                error: 'Password protected link',
                message: 'This link requires a password to access.',
                requiresPassword: true,
                shortCode: code
            });
        }

        // 5. Handle One-Time links
        if (url.isOneTime) {
            await Url.deleteOne({ _id: url._id });
            await redis.del(code);
        } else {
            // Update click count
await Url.updateOne({ _id: url._id }, { $inc: { clicks: 1 } });
        }

        // 6. Cache for future requests (if not one-time)
        if (!url.isOneTime) {
            const ttl = url.expiresAt 
                ? Math.floor((url.expiresAt - Date.now()) / 1000)
                : 3600; // Default 1 hour
            if (ttl > 5) {
await redis.set(
                    code,
                    JSON.stringify({
                        url: url.originalUrl,
                        isOneTime: false
                    }),
                    'EX',
                    ttl
                );            }
        }

        logger.info('URL redirect successful', { 
            shortCode: code, 
            
        });
        res.redirect(url.originalUrl);
    } catch (err) {
           const code = req.params?.code;

        logger.error('Redirect failed', { 
            error: err.message, 
            stack: err.stack,
            code 
        });
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process redirect request.'
        });
    }
};

exports.getRedirectInfo = async (req, res) => {
    try {
        const { code } = req.params;

        // Check Redis Cache (only for non-password protected URLs)
        const cached = await redis.get(code);
        if (cached) {
            const parsed = JSON.parse(cached);

            // Update click count in background (fire and forget)
            Url.findOneAndUpdate({ shortCode: code }, { $inc: { clicks: 1 } }).catch(() => {});
            return res.json({
                redirect: true,
                url: parsed.url
            });
        }

        // Database Fallback
        const url = await Url.findOne({ shortCode: code });
        if (!url) {
            return res.status(404).json({ 
                error: 'Link not found',
                message: 'This shortened link does not exist or has been deleted.'
            });
        }

        // Check if link has expired
        if (url.expiresAt && new Date() > url.expiresAt) {
            await Url.deleteOne({ _id: url._id });
            await redis.del(code);
            return res.status(410).json({ 
                error: 'Link expired',
                message: 'This shortened link has expired.'
            });
        }

        // Password Check - Return structured response for frontend to handle
        if (url.password) {
            return res.json({ 
                requiresPassword: true,
                shortCode: code
            });
        }

        // // Handle One-Time links
        // if (url.isOneTime) {
        //     await Url.deleteOne({ _id: url._id });
        //     await redis.del(code);
        // } else {
        //     // Update click count
        //     await Url.findOneAndUpdate({ _id: url._id }, { $inc: { clicks: 1 } });
        // }

        // Cache for future requests (if not one-time)
        // if (!url.isOneTime) {
        //     const ttl = url.expiresAt 
        //         ? Math.floor((url.expiresAt - Date.now()) / 1000)
        //         : 3600; // Default 1 hour
        //     if (ttl > 0) {
        //         await redis.set(code, url.originalUrl, 'EX', ttl);
        //     }
        // }

        // logger.info('URL redirect info retrieved', { 
        //     shortCode: code, 
        //     isOneTime: url.isOneTime,
        // });
        
        return res.json({
            redirect: true,
            url: url.originalUrl
        });
    } catch (err) {
           const code = req.params?.code;

        logger.error('Get redirect info failed', { 
            error: err.message, 
            stack: err.stack,
            code 
        });
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process redirect request.'
        });
    }
};

exports.verifyPassword = async (req, res) => {
    try {
        const { code } = req.params;
        const { password } = req.body;

        // ✅ FIX: basic rate limiting for brute force
        const ip = req.ip;
        const attemptsKey = `pw_attempts:${code}:${ip}`;
        const attempts = await redis.incr(attemptsKey);

        if (attempts === 1) {
            await redis.expire(attemptsKey, 60); // 1 min window
        }

        if (attempts > 5) {
            return res.status(429).json({
                error: "Too many attempts. Try again later."
            });
        }


        const url = await Url.findOne({ shortCode: code });
        
        if (!url) {
            return res.status(404).json({ 
                error: 'Link not found',
                message: 'This shortened link does not exist.'
            });
        }

        // Check if link has expired
        if (url.expiresAt && new Date() > url.expiresAt) {
            await Url.deleteOne({ _id: url._id });
            await redis.del(code);
            return res.status(410).json({ 
                error: 'Link expired',
                message: 'This shortened link has expired.'
            });
        }

        if (!url.password) {
            return res.status(400).json({ 
                error: 'No password required',
                message: 'This link is not password protected.'
            });
        }

        const isValid = await bcrypt.compare(password, url.password);
        if (!isValid) {
            return res.status(401).json({ 
                error: 'Invalid password',
                message: 'The password you entered is incorrect.'
            });
        }
        // success reset attempts
        await redis.del(attemptsKey);


        // Password correct - return the original URL
        // Handle one-time links
        if (url.isOneTime) {
            await Url.deleteOne({ _id: url._id });
            await redis.del(code);
        } else {
            // Update click count
            await Url.findOneAndUpdate({ _id: url._id }, { $inc: { clicks: 1 } });
        }

        logger.info('Password verification successful', { shortCode: code });
        res.json({
            success: true,
            originalUrl: url.originalUrl,
            isOneTime: url.isOneTime
        });
    } catch (err) {
           const code = req.params?.code;

        logger.error('Password verification failed', { 
            error: err.message, 
            stack: err.stack,
            code 
        });
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to verify password.'
        });
    }
};