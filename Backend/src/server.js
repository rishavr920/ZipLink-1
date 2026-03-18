require('dotenv').config();
const app = require('./app');
const { initIdGenerator } = require('./config/idGenerator');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDB();

        await initIdGenerator();

        app.listen(PORT, () => {
            console.log("Server started on port " + PORT);
        });
    } catch(err) {
        console.log(err);
    }
}

startServer();