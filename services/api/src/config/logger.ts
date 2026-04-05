import winston from 'winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const isDevelopment = process.env.NODE_ENV === 'development';

const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'groomlink-api' },
  transports: [
    new winston.transports.Console({
      format: isDevelopment
        ? combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            devFormat
          )
        : combine(timestamp(), json()),
    }),
  ],
});

if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    })
  );
}

export default logger;
