const winston = require('winston');
const path = require('path');
const { combine, timestamp, errors } = winston.format;

const logDirectory = path.join(__dirname, 'Logs');
const logFilePath = path.join(logDirectory, 'app.log');

const logger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), errors({ stack: true }), winston.format.json()),
  transports: [new winston.transports.File({ filename: logFilePath })],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDirectory, 'rejections.log'),
    }),
  ],
});

module.exports = logger;
