import { ZodError } from 'zod';
export const errorHandler = (err, req, res, next) => {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
        return;
    }
    // Handle known HTTP errors
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'An unexpected internal server error occurred.';
    // Safe logging (no credentials or tokens)
    console.error(`[Error] ${req.method} ${req.url} [Status ${status}]:`, message);
    res.status(status).json({
        error: message,
        timestamp: new Date().toISOString()
    });
};
