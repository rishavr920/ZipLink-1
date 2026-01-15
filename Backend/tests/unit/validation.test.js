const { validateShortenUrl } = require('../../src/middleware/validation');
const httpMocks = require('node-mocks-http');

describe('URL Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();
    });

    test('should accept valid URL', () => {
        req.body = {
            longUrl: 'https://example.com'
        };

        validateShortenUrl(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(0); // Not set means success
    });

    test('should reject invalid URL', () => {
        req.body = {
            longUrl: 'not-a-url'
        };

        validateShortenUrl(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toHaveProperty('error', 'Validation failed');
    });

    test('should reject missing URL', () => {
        req.body = {};

        validateShortenUrl(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
    });

    test('should accept valid password', () => {
        req.body = {
            longUrl: 'https://example.com',
            password: 'mypassword123'
        };

        validateShortenUrl(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('should reject short password', () => {
        req.body = {
            longUrl: 'https://example.com',
            password: 'abc'
        };

        validateShortenUrl(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
    });

    test('should accept valid expiry hours', () => {
        req.body = {
            longUrl: 'https://example.com',
            expiryHours: 24
        };

        validateShortenUrl(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    test('should reject invalid expiry hours', () => {
        req.body = {
            longUrl: 'https://example.com',
            expiryHours: 10000
        };

        validateShortenUrl(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(400);
    });

    test('should strip unknown fields', () => {
        req.body = {
            longUrl: 'https://example.com',
            unknownField: 'should be removed'
        };

        validateShortenUrl(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body).not.toHaveProperty('unknownField');
    });
});
