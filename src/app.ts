import express from 'express';
import { config } from './config';
import { applyCommonMiddleware, applyErrorMiddleware } from './middleware';
import { appRoutes } from './routes';
import logger from '@/utils/logger';
import { createSafeErrorObject } from './utils/error';

/**
 * Creates Express application with functional composition
 * Pure function for app creation and configuration
 */
export const createApp = (): express.Application => {
  const app = express();

  // Apply common middleware
  applyCommonMiddleware(app);

  // Mount application routes
  app.use(appRoutes);

  // Apply error handling middleware (must be last)
  applyErrorMiddleware(app);

  return app;
};

/**
 * Starts the server with graceful shutdown handling
 * Function for server lifecycle management
 */
export const startServer = async (app: express.Application, port: number) => {
  try {
    // Start the server
    const server = app.listen(port, () => {
      logger.info(`Server started successfully`, {
        port,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📱 Environment: ${config.nodeEnv}`);
      logger.info(`🔍 Health check: http://localhost:${port}/api/health`);
      logger.info(`📊 Testing API: http://localhost:${port}/api/testing`);
      logger.info(`🤖 AI API: http://localhost:${port}/api/ai`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(err => {
        if (err) {
          logger.error('Error during graceful shutdown', { error: err });
          process.exit(1);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout', { error: 'Timeout' });
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions (these are serious and should crash)
    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception - This is serious, shutting down', {
        error: createSafeErrorObject(error),
      });
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections (log but don't crash for non-critical errors)
    process.on('unhandledRejection', (reason, promise) => {
      const errorStr = reason?.toString() || 'Unknown rejection';
      // Check if it's a critical error that should crash the app
      const isCritical =
        errorStr.includes('ECONNREFUSED') || // Database connection refused
        errorStr.includes('ENOTFOUND') || // DNS/Host not found
        errorStr.includes('authentication') || // Auth failures
        errorStr.includes('permission denied'); // Permission errors

      if (isCritical) {
        logger.error('Critical Unhandled Promise Rejection - Shutting down', {
          error: { reason: errorStr, promise: promise.toString() },
        });
        gracefulShutdown('unhandledRejection');
      } else {
        // For non-critical errors (timeouts, etc.), just log them
        logger.warn('Unhandled Promise Rejection - Continuing operation', {
          error: { reason: errorStr, promise: promise.toString() },
          message: 'This error was not considered critical enough to crash the server',
        });
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the application when this file is run directly
if (require.main === module) {
  const app = createApp();
  const port = config.port || 3000;

  startServer(app, port).catch(error => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}
