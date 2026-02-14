/**
 * Snowflake ID Generator
 * 
 * Twitter's Snowflake algorithm for generating unique IDs in distributed systems.
 * 
 * ID Structure (64 bits):
 * - 41 bits: Timestamp (milliseconds since epoch)
 * - 10 bits: Worker ID (0-1023, unique per server)
 * - 12 bits: Sequence number (0-4095, resets per millisecond)
 * 
 * Benefits:
 * - No coordination needed (each server generates IDs independently)
 * - No single point of failure
 * - Contains timestamp (can extract creation time)
 * - Guaranteed unique across all servers
 * - Very fast (no network calls)
 */

const logger = require('../utils/logger');

// Snowflake configuration
const EPOCH = 1609459200000; // 2021-01-01 00:00:00 UTC (custom epoch to reduce ID size)
const WORKER_ID_BITS = 10; // 10 bits = 1024 workers max
const SEQUENCE_BITS = 12; // 12 bits = 4096 IDs per millisecond per worker

// Maximum values
const MAX_WORKER_ID = (1 << WORKER_ID_BITS) - 1; // 1023
const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1; // 4095

// Bit shifts
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS; // 22
const WORKER_ID_SHIFT = SEQUENCE_BITS; // 12

// Get worker ID from environment or use process ID
// In production, use unique worker ID per server (0-1023)
const WORKER_ID = parseInt(process.env.WORKER_ID || (process.pid % (MAX_WORKER_ID + 1)), 10);

// Validate worker ID
if (WORKER_ID < 0 || WORKER_ID > MAX_WORKER_ID) {
    throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
}

let sequence = 0;
let lastTimestamp = -1;

/**
 * Get current timestamp in milliseconds (relative to custom epoch)
 */
function getCurrentTimestamp() {
    return Date.now() - EPOCH;
}

// wait until next millisecond

function waitNextMillisecond(lastTimestamp) {
    let timestamp = getCurrentTimestamp();
    while (timestamp <= lastTimestamp) {
        timestamp = getCurrentTimestamp();
    }
    return timestamp;
}


// generating next Snowflake ID ,64-bit unique ID 
function generateId() {
    let timestamp = getCurrentTimestamp();

    // If clock moved backwards, throw error
    if (timestamp < lastTimestamp) {
        const offset = lastTimestamp - timestamp;
        logger.error('Clock moved backwards, refusing to generate ID', { 
            offset,
            lastTimestamp,
            currentTimestamp: timestamp
        });
        throw new Error(`Clock moved backwards. Refusing to generate ID for ${offset}ms`);
    }

    // Same millisecond - increment sequence
    if (timestamp === lastTimestamp) {
        sequence = (sequence + 1) & MAX_SEQUENCE;
        
        // Sequence overflow - wait for next millisecond
        if (sequence === 0) {
            timestamp = waitNextMillisecond(lastTimestamp);
        }
    } else {
        // New millisecond - reset sequence
        sequence = 0;
    }

    lastTimestamp = timestamp;

    // Generate ID: timestamp (41 bits) + worker ID (10 bits) + sequence (12 bits)
    const id = (timestamp << TIMESTAMP_SHIFT) | (WORKER_ID << WORKER_ID_SHIFT) | sequence;

    logger.debug('Snowflake ID generated', {
        id,
        timestamp,
        workerId: WORKER_ID,
        sequence,
        binary: id.toString(2).padStart(64, '0')
    });

    return id;
}

/**
 * Extract timestamp from Snowflake ID
 * 
 * @param {number} id - Snowflake ID
 * @returns {Date} Creation timestamp
 */
function extractTimestamp(id) {
    const timestamp = (id >> TIMESTAMP_SHIFT) + EPOCH;
    return new Date(timestamp);
}

/**
 * Extract worker ID from Snowflake ID
 * 
 * @param {number} id - Snowflake ID
 * @returns {number} Worker ID
 */
function extractWorkerId(id) {
    return (id >> WORKER_ID_SHIFT) & MAX_WORKER_ID;
}

/**
 * Extract sequence from Snowflake ID
 * 
 * @param {number} id - Snowflake ID
 * @returns {number} Sequence number
 */
function extractSequence(id) {
    return id & MAX_SEQUENCE;
}

/**
 * Initialize Snowflake generator
 * Logs configuration for debugging
 */
function initSnowflake() {
    logger.info('Snowflake ID generator initialized', {
        workerId: WORKER_ID,
        maxWorkerId: MAX_WORKER_ID,
        maxSequence: MAX_SEQUENCE,
        epoch: new Date(EPOCH).toISOString(),
        idsPerMsPerWorker: MAX_SEQUENCE + 1,
        maxIdsPerMs: (MAX_WORKER_ID + 1) * (MAX_SEQUENCE + 1)
    });
}

// Initialize on module load
initSnowflake();

module.exports = {
    generateId,
    extractTimestamp,
    extractWorkerId,
    extractSequence,
    initSnowflake,
    // Export constants for testing
    WORKER_ID,
    MAX_WORKER_ID,
    MAX_SEQUENCE,
    EPOCH
};
