import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCatalogService } from '../errors/error-catalog.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Global exception filter that handles:
 * 1. AppError — resolved via ErrorCatalog with structured response
 * 2. HttpException — NestJS exceptions passed through with catalog enrichment
 * 3. Error — legacy throws mapped via message pattern matching
 * 4. Unknown — generic 500 with safe message
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppExceptionFilter.name);

    constructor(private readonly catalog: ErrorCatalogService) { }

    private logToFile(message: string, stack?: string) {
        try {
            const logPath = 'c:\\Users\\EmmanuelVanDeGeer\\.gemini\\antigravity\\scratch\\labamu-ims\\backend_errors.log';
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${message}\n${stack || 'No stack'}\n- - -\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            // Can't log the logger's failure
        }
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        this.logToFile('ALL EXCEPTION CATCHER:', String(exception instanceof Error ? exception.stack : exception));

        // 1. AppError — resolve from catalog
        if (exception instanceof AppError) {
            const resolved = this.catalog.resolve(exception.code, exception.context);
            this.logger.warn(
                `[${resolved.code}] ${resolved.message}`,
                exception.stack,
            );
            response.status(resolved.httpStatus).json(resolved);
            return;
        }

        // 2. HttpException — NestJS built-in (BadRequestException, NotFoundException, etc.)
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            const message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : (exceptionResponse as any).message || exception.message;

            response.status(status).json({
                statusCode: status,
                code: `HTTP_${status}`,
                message: Array.isArray(message) ? message.join('; ') : message,
                userMessage: this.getHttpUserMessage(status, message),
                severity: status >= 500 ? 'error' : 'warning',
                category: 'http',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 3. Plain Error — try to match via legacy message patterns
        if (exception instanceof Error) {
            const legacyResolved = this.catalog.resolveFromMessage(exception.message);
            if (legacyResolved) {
                // Matched a catalog code — upgrade the message to include original context
                legacyResolved.message = exception.message;
                this.logger.warn(
                    `[LEGACY→${legacyResolved.code}] ${exception.message}`,
                    exception.stack,
                );
                response.status(legacyResolved.httpStatus).json(legacyResolved);
                return;
            }

            // No match — return as 500 but expose the original message for debugging
            this.logger.error(
                `[UNHANDLED] ${exception.message}`,
                exception.stack,
            );
            this.logToFile(`[UNHANDLED] ${exception.message}`, exception.stack);
            response.status(500).json({
                statusCode: 500,
                code: 'INTERNAL_ERROR',
                message: exception.message,
                userMessage: 'An unexpected error occurred. Please try again or contact support.',
                severity: 'error',
                category: 'system',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 4. Unknown — completely unexpected
        this.logger.error('[UNKNOWN] Non-Error exception caught', exception);
        this.logToFile('[UNKNOWN] Non-Error exception caught', JSON.stringify(exception));
        response.status(500).json({
            statusCode: 500,
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred.',
            userMessage: 'An unexpected error occurred. Please try again or contact support.',
            severity: 'error',
            category: 'system',
            timestamp: new Date().toISOString(),
        });
    }

    private getHttpUserMessage(status: number, message: any): string {
        const msg = typeof message === 'string' ? message : '';
        switch (status) {
            case 400:
                return msg || 'The request was invalid. Please check your input and try again.';
            case 401:
                return 'You are not authorised to perform this action. Please log in.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return msg || 'The requested resource could not be found.';
            case 409:
                return msg || 'This operation conflicts with existing data.';
            case 422:
                return msg || 'The request data could not be processed. Please check your input.';
            default:
                return status >= 500
                    ? 'A server error occurred. Please try again or contact support.'
                    : msg || 'Something went wrong. Please try again.';
        }
    }
}
