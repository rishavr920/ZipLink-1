require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');
const { initIdGenerator } = require('./config/idGenerator');

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Connected');
        
        // Initialize ID generator (Snowflake-based)
        try {
            await initIdGenerator();
            console.log('✅ ID Generator (Snowflake) initialized');
        } catch (err) {
            console.error('❌ ID Generator initialization failed:', err.message);
            // Snowflake doesn't need external services, so this shouldn't fail
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 Server is flying on port ${PORT}`);
        });
    })
    .catch(err => console.log('❌ DB Connection Error:', err));