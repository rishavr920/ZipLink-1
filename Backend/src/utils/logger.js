const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development (more readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

const transports = [
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
    })
];

if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    );
}

const loggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'ziplink-backend' },
    transports
};

if (process.env.NODE_ENV !== 'production') {
    loggerConfig.exceptionHandlers = [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ];
    loggerConfig.rejectionHandlers = [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ];
}

// Create logger instance
const logger = winston.createLogger(loggerConfig);

module.exports = logger;
