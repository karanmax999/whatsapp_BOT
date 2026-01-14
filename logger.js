const winston = require('winston');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        // Console transport for live logs (Render dashboard)
        new winston.transports.Console(),
        // File transport for local history (optional in container)
        new winston.transports.File({ filename: 'bot.log' })
    ],
});

module.exports = logger;
