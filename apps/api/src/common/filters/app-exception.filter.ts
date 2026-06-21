import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { ErrorCatalogService } from '../errors/error-catalog.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Global exception filter that handles:
 * 1. AppError — resolved via ErrorCatalog with structured response
 * 2. HttpException — NestJS built-ins passed through with catalog enrichment
 * 3. Error — legacy throws mapped via message pattern matching
 * 4. Unknown — generic 500 with safe message
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AppExceptionFilter.name);
    private readonly logPath: string | null;

    constructor(private readonly catalog: ErrorCatalogService) {
        const logDir = process.env.LOG_DIR ?? path.join(process.cwd(), 'logs');
        // Only write to file in non-production environments; in prod use stdout
        this.logPath = isProd ? null : path.join(logDir, 'backend_errors.log');
        if (this.logPath) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    private logToFile(message: string, stack?: string) {
        if (!this.logPath) return;
        try {
            const entry = `[${new Date().toISOString()}] ${message}\n${stack ?? 'No stack'}\n---\n`;
            fs.appendFileSync(this.logPath, entry);
        } catch {
            // Silently swallow file-write failures
        }
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        // 1. AppError — structured catalog response
        if (exception instanceof AppError) {
            const resolved = this.catalog.resolve(exception.code, exception.context);
            this.logger.warn(`[${resolved.code}] ${resolved.message}`, exception.stack);
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
                    : (exceptionResponse as any).message ?? exception.message;

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

        // 3. PrismaClientKnownRequestError — safe mapping before the generic Error handler
        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            const ts = new Date().toISOString();
            const code = exception.code;
            if (code === 'P2025') {
                response.status(404).json({ statusCode: 404, code: 'NOT_FOUND', message: 'Record not found.', userMessage: 'The requested resource could not be found.', severity: 'warning', category: 'data', timestamp: ts });
            } else if (code === 'P2002') {
                response.status(409).json({ statusCode: 409, code: 'CONFLICT', message: 'Duplicate value — a record with this data already exists.', userMessage: 'This item already exists. Please use a different value.', severity: 'warning', category: 'data', timestamp: ts });
            } else if (code === 'P2003') {
                response.status(400).json({ statusCode: 400, code: 'FK_VIOLATION', message: 'Invalid reference — the linked record does not exist.', userMessage: 'One of the referenced items could not be found.', severity: 'warning', category: 'data', timestamp: ts });
            } else {
                this.logger.error(`[PRISMA:${code}] ${exception.message}`, exception.stack);
                this.logToFile(`[PRISMA:${code}] ${exception.message}`, exception.stack);
                response.status(500).json({ statusCode: 500, code: 'DB_ERROR', message: isProd ? 'A database error occurred.' : `Prisma error ${code}`, userMessage: 'A database error occurred. Please try again or contact support.', severity: 'error', category: 'system', timestamp: ts });
            }
            return;
        }

        // 4. Plain Error — try to match via legacy message patterns
        if (exception instanceof Error) {
            const legacyResolved = this.catalog.resolveFromMessage(exception.message);
            if (legacyResolved) {
                legacyResolved.message = exception.message;
                this.logger.warn(`[LEGACY→${legacyResolved.code}] ${exception.message}`, exception.stack);
                response.status(legacyResolved.httpStatus).json(legacyResolved);
                return;
            }

            this.logger.error(`[UNHANDLED] ${exception.message}`, exception.stack);
            this.logToFile(`[UNHANDLED] ${exception.message}`, exception.stack);
            response.status(500).json({
                statusCode: 500,
                code: 'INTERNAL_ERROR',
                // Never expose raw exception.message in production
                message: isProd ? 'An unexpected error occurred.' : exception.message,
                userMessage: 'An unexpected error occurred. Please try again or contact support.',
                severity: 'error',
                category: 'system',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        // 5. Unknown — completely unexpected
        this.logger.error('[UNKNOWN] Non-Error exception caught', JSON.stringify(exception));
        this.logToFile('[UNKNOWN] Non-Error exception caught', JSON.stringify(exception));
        response.status(500).json({
            statusCode: 500,
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred.',
            userMessage: 'An unexpected error occurred. Please try again or contact support.',
            severity: 'error',
            category: 'system',
            timestamp: new Date().toISOString(),
        });
    }

    private getHttpUserMessage(status: number, message: any): string {
        const msg = typeof message === 'string' ? message : '';
        switch (status) {
            case 400: return msg || 'The request was invalid. Please check your input and try again.';
            case 401: return 'You are not authorised to perform this action. Please log in.';
            case 403: return 'You do not have permission to perform this action.';
            case 404: return msg || 'The requested resource could not be found.';
            case 409: return msg || 'This operation conflicts with existing data.';
            case 422: return msg || 'The request data could not be processed. Please check your input.';
            default:
                return status >= 500
                    ? 'A server error occurred. Please try again or contact support.'
                    : msg || 'Something went wrong. Please try again.';
        }
    }
}
