import winston from 'winston';
import { config } from '@/config';
import { LogContext, LogLevel } from '@/types';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development
const developmentFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    config.nodeEnv === 'development' ? combine(colorize(), developmentFormat) : json()
  ),
  defaultMeta: { service: 'nodejs-api' },
  transports: [
    new winston.transports.Console({
      silent: config.nodeEnv === 'test',
    }),
  ],
});

// Add file transport for production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

class Logger {
  private static instance: Logger;
  private winstonLogger: winston.Logger;

  private constructor() {
    this.winstonLogger = logger;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public error(message: string, meta?: LogContext): void {
    this.winstonLogger.error(message, meta);
  }

  public warn(message: string, meta?: LogContext): void {
    this.winstonLogger.warn(message, meta);
  }

  public info(message: string, meta?: LogContext): void {
    this.winstonLogger.info(message, meta);
  }

  public debug(message: string, meta?: LogContext): void {
    this.winstonLogger.debug(message, meta);
  }

  public log(level: LogLevel, message: string, meta?: LogContext): void {
    this.winstonLogger.log(level, message, meta);
  }
}

export const loggerInstance = Logger.getInstance();
export default loggerInstance;

// Export backward compatible functions for existing code
export const logInfo = (message: string, meta?: any) => {
  return loggerInstance.info(message, meta);
};

export const logError = (message: string, error?: Error | any) => {
  return loggerInstance.error(message, { error: error?.stack || error });
};

export const logWarn = (message: string, meta?: any) => {
  return loggerInstance.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  return loggerInstance.debug(message, meta);
};

/**
 * Creates request logger function
 * Higher-order function for request logging
 */
export const createRequestLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logInfo('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    });

    next();
  };
};
