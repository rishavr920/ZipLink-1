const zookeeper = require('node-zookeeper-client');
const logger = require('../utils/logger');

const ZK_HOST = process.env.ZK_HOST || 'zookeeper:2181';
const client = zookeeper.createClient(ZK_HOST);

let startID = 0;
let endID = 0;
let currentCounter = 0;

async function initZooKeeper() {
    client.once('connected', () => {
        logger.info('ZooKeeper connected successfully', { host: ZK_HOST });
        ensureNodeExists();
    });

    client.on('error', (err) => {
        logger.error('ZooKeeper client error', { 
            error: err.message, 
            stack: err.stack 
        });
    });

    client.connect();
}

function ensureNodeExists() {
    const path = '/id-range';
    client.exists(path, (error, stat) => {
        if (error) return console.error("ZK Exists Error:", error);

        if (!stat) {
            // Agar node nahi hai toh create karo initial value '0' ke saath
            client.create(path, Buffer.from('0'), (err) => {
                if (err && err.getCode() !== zookeeper.Exception.NODE_EXISTS) {
                    return console.error("ZK Create Error:", err);
                }
                fetchRange();
            });
        } else {
            fetchRange();
        }
    });
}

function fetchRange() {
    const path = '/id-range';
    
    // getData hume current version (stat) deta hai
    client.getData(path, (error, data, stat) => {
        if (error) return console.error("ZK Fetch Error:", error);

        const counter = parseInt(data.toString());
        const nextStart = counter;
        const nextEnd = counter + 999;

        // Version-based update (Optimistic Locking)
        // Agar version match nahi karega, matlab kisi aur instance ne range le li hai
        client.setData(path, Buffer.from((nextEnd + 1).toString()), stat.version, (err) => {
            if (err) {
                // Range conflict detected, retry for next range
                logger.warn('ZooKeeper range conflict detected, retrying', { 
                    error: err.message 
                });
                return fetchRange();
            }

            // Success! Range allotted
            startID = nextStart;
            endID = nextEnd;
            currentCounter = startID;
            logger.info('ZooKeeper range allotted', { 
                startID, 
                endID, 
                rangeSize: endID - startID + 1 
            });
        });
    });
}

function getNextID() {
    // If range is exhausted, fetch new range
    if (currentCounter > endID) {
        logger.warn('ID range exhausted, fetching new range', { 
            currentCounter, 
            endID 
        });
        fetchRange();
        return null; 
    }
    const id = currentCounter++;
    logger.debug('ID generated', { id, remainingInRange: endID - currentCounter + 1 });
    return id;
}

module.exports = { initZooKeeper, getNextID };