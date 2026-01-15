const { encode } = require('../../src/utils/base62');

describe('Base62 Encoding', () => {
    test('should encode 0 to "0"', () => {
        expect(encode(0)).toBe('0');
    });

    test('should encode 1 to "1"', () => {
        expect(encode(1)).toBe('1');
    });

    test('should encode 61 to "Z"', () => {
        expect(encode(61)).toBe('Z');
    });

    test('should encode 62 to "10"', () => {
        expect(encode(62)).toBe('10');
    });

    test('should encode 12345 to "dnh"', () => {
        expect(encode(12345)).toBe('dnh');
    });

    test('should encode large numbers correctly', () => {
        expect(encode(1000000)).toBe('4c92');
    });

    test('should produce unique encodings for sequential numbers', () => {
        const encodings = [1, 2, 3, 4, 5].map(encode);
        const unique = new Set(encodings);
        expect(unique.size).toBe(5);
    });
});
