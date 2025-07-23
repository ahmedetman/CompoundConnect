// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Specific error types
  if (err.name === 'ValidationError') {
    error.status = 400;
    error.message = 'Validation Error';
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.status = 401;
    error.message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    error.status = 403;
    error.message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    error.status = 404;
    error.message = 'Resource not found';
  } else if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    error.status = 409;
    error.message = 'Resource already exists';
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    error.status = 400;
    error.message = 'Invalid reference to related resource';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    delete err.stack;
    if (error.status === 500) {
      error.message = 'Internal Server Error';
    }
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack })
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error classes
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
};