const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Url = require('../../src/models/Url');
const { redis } = require('../../src/config/db');

// Mock ID Generator (Snowflake) for tests
let mockCounter = 1000000000000; // Start with a large number to simulate Snowflake IDs
jest.mock('../../src/config/idGenerator', () => ({
    getNextID: jest.fn(() => Promise.resolve(mockCounter++)),
    initIdGenerator: jest.fn(() => Promise.resolve())
}));

describe('URL Controller Integration Tests', () => {
    let testCounter = 1000;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/ziplink-test');
        }
    });

    afterAll(async () => {
        // Clean up
        await Url.deleteMany({});
        await mongoose.connection.close();
        await redis.quit();
    });

    beforeEach(async () => {
        // Clear database and cache before each test
        await Url.deleteMany({});
        await redis.flushall();
        
        // Reset counter
        mockCounter = 1000;
        const { getNextID } = require('../../src/config/zookeeper');
        getNextID.mockImplementation(() => mockCounter++);
    });

    describe('POST /api/shorten', () => {
        test('should shorten a valid URL', async () => {
            const response = await request(app)
                .post('/api/shorten')
                .send({ longUrl: 'https://example.com' })
                .expect(201);

            expect(response.body).toHaveProperty('shortCode');
            expect(response.body).toHaveProperty('shortUrl');
            expect(response.body).toHaveProperty('qrCode');
            expect(response.body.originalUrl).toBe('https://example.com');
        });

        test('should reject invalid URL', async () => {
            const response = await request(app)
                .post('/api/shorten')
                .send({ longUrl: 'not-a-url' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });

        test('should create password-protected URL', async () => {
            const response = await request(app)
                .post('/api/shorten')
                .send({ 
                    longUrl: 'https://example.com',
                    password: 'mypassword123'
                })
                .expect(201);

            expect(response.body.isPasswordProtected).toBe(true);
            
            // Verify password is stored in database
            const url = await Url.findOne({ shortCode: response.body.shortCode });
            expect(url.password).toBeDefined();
            expect(url.password).not.toBe('mypassword123'); // Should be hashed
        });

        test('should create one-time URL', async () => {
            const response = await request(app)
                .post('/api/shorten')
                .send({ 
                    longUrl: 'https://example.com',
                    isOneTime: true
                })
                .expect(201);

            expect(response.body.isOneTime).toBe(true);
        });

        test('should create URL with expiry', async () => {
            const response = await request(app)
                .post('/api/shorten')
                .send({ 
                    longUrl: 'https://example.com',
                    expiryHours: 24
                })
                .expect(201);

            expect(response.body.expiresAt).toBeDefined();
            const expiryDate = new Date(response.body.expiresAt);
            const now = new Date();
            const hoursDiff = (expiryDate - now) / (1000 * 60 * 60);
            expect(hoursDiff).toBeCloseTo(24, 0);
        });
    });

    describe('GET /:code', () => {
        test('should redirect to original URL', async () => {
            // Create a URL first
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'test123'
            });

            const response = await request(app)
                .get(`/${url.shortCode}`)
                .expect(302);

            expect(response.headers.location).toBe('https://example.com');
        });

        test('should return 404 for non-existent code', async () => {
            await request(app)
                .get('/nonexistent')
                .expect(404);
        });

        test('should return 403 for password-protected URL', async () => {
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'protected',
                password: '$2a$10$dummyhash'
            });

            const response = await request(app)
                .get(`/${url.shortCode}`)
                .expect(403);

            expect(response.body).toHaveProperty('requiresPassword', true);
        });

        test('should delete one-time URL after redirect', async () => {
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'onetime',
                isOneTime: true
            });

            await request(app)
                .get(`/${url.shortCode}`)
                .expect(302);

            // Verify URL is deleted
            const deletedUrl = await Url.findOne({ shortCode: 'onetime' });
            expect(deletedUrl).toBeNull();
        });

        test('should return 410 for expired URL', async () => {
            const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'expired',
                expiresAt: expiredDate
            });

            const response = await request(app)
                .get(`/${url.shortCode}`)
                .expect(410);

            expect(response.body).toHaveProperty('error', 'Link expired');
        });
    });

    describe('POST /api/verify-password/:code', () => {
        test('should verify correct password', async () => {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('mypassword', 10);
            
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'protected',
                password: hashedPassword
            });

            const response = await request(app)
                .post(`/api/verify-password/${url.shortCode}`)
                .send({ password: 'mypassword' })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('originalUrl', 'https://example.com');
        });

        test('should reject incorrect password', async () => {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('mypassword', 10);
            
            const url = await Url.create({
                originalUrl: 'https://example.com',
                shortCode: 'protected',
                password: hashedPassword
            });

            const response = await request(app)
                .post(`/api/verify-password/${url.shortCode}`)
                .send({ password: 'wrongpassword' })
                .expect(401);

            expect(response.body).toHaveProperty('error', 'Invalid password');
        });
    });
});
