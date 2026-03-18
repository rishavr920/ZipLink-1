require('dotenv').config();
const app = require('./app');
const { initIdGenerator } = require('./config/idGenerator');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDB();

        await initIdGenerator();

        app.listen(PORT, () => {
            logger.info(`Server started on port ${PORT}`);
        });
    } catch(err) {
        logger.error('Failed to start server', {
            error: err.message,
            stack: err.stack
        });
        process.exit(1);
    }
}

startServer();
