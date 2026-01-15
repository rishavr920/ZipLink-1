/**
 * ID Generator - Snowflake Implementation
 * 
 * Uses Twitter's Snowflake algorithm for distributed ID generation.
 * No coordination needed - each server generates IDs independently.
 */

const { generateId, initSnowflake } = require('./snowflake');
const logger = require('../utils/logger');

/**
 * Initialize the ID generator
 */
async function initIdGenerator() {
    try {
        initSnowflake();
        logger.info('ID generator (Snowflake) initialized successfully');
    } catch (err) {
        logger.error('Failed to initialize ID generator', { 
            error: err.message,
            stack: err.stack
        });
        throw err;
    }
}

/**
 * Get the next unique ID using Snowflake algorithm
 * 
 * Snowflake IDs are generated locally on each server with no coordination needed.
 * Each ID contains: timestamp (41 bits) + worker ID (10 bits) + sequence (12 bits)
 * 
 * @returns {Promise<number>} The next unique 64-bit ID
 */
async function getNextID() {
    try {
        // Snowflake generates IDs locally - no network calls needed
        const id = generateId();
        
        logger.debug('ID generated using Snowflake', { id });
        
        return id;
    } catch (err) {
        logger.error('Failed to generate ID', { 
            error: err.message,
            stack: err.stack
        });
        throw new Error('Failed to generate unique ID. Please try again.');
    }
}

module.exports = { 
    initIdGenerator, 
    getNextID
};
