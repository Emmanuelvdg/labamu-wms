/**
 * Application-level error that carries an error catalog code and context variables.
 * 
 * Usage:
 *   throw new AppError('PRODUCT_NOT_FOUND', { productId: '123' });
 *   throw new AppError('CAPACITY_EXCEEDED', { currentWeight: 500, maxWeight: 100 });
 * 
 * The global AppExceptionFilter catches these and resolves the code via the
 * ErrorCatalog to produce a structured HTTP response with user-friendly messages.
 */
export class AppError extends Error {
    constructor(
        public readonly code: string,
        public readonly context: Record<string, any> = {},
    ) {
        super(code);
        this.name = 'AppError';
        // Maintain proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}
