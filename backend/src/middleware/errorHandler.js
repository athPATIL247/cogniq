// filename: backend/src/middleware/errorHandler.js
import { config } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (config.isDev) {
    console.error('[ErrorHandler]', err.stack || err);
  } else {
    console.error('[ErrorHandler]', err.message);
  }

  let statusCode = err.statusCode || err.status || 500;

  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'UnauthorizedError') statusCode = 401;
  if (err.name === 'JsonWebTokenError') statusCode = 401;
  if (err.name === 'TokenExpiredError') statusCode = 401;
  if (err.name === 'CastError') statusCode = 400;

  const message =
    statusCode === 500 && !config.isDev
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.isDev && err.stack ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
