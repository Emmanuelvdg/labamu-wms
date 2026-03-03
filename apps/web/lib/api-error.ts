'use client';

import { toast } from 'sonner';

/**
 * Structured error response from the Error Catalog system.
 * The API returns this shape for all errors when the AppExceptionFilter is active.
 */
interface CatalogErrorResponse {
    statusCode: number;
    errorCode: string;
    message: string;
    userMessage: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    category: string;
    timestamp: string;
    context?: Record<string, any>;
}

/**
 * Parse an API error response and display a user-friendly toast notification.
 * Works with the Error Catalog system's structured JSON responses.
 *
 * @param error - The caught error (from fetch or axios)
 * @param fallbackMessage - Fallback message if the error can't be parsed
 */
export async function handleApiError(
    error: unknown,
    fallbackMessage = 'An unexpected error occurred'
): Promise<void> {
    let userMessage = fallbackMessage;
    let severity: 'info' | 'warning' | 'error' | 'critical' = 'error';

    try {
        if (error instanceof Response) {
            // fetch Response object
            const body = await error.json() as Partial<CatalogErrorResponse>;
            userMessage = body.userMessage || body.message || fallbackMessage;
            severity = body.severity || 'error';
        } else if (error && typeof error === 'object') {
            const err = error as any;

            // Axios-style error
            if (err.response?.data) {
                const data = err.response.data as Partial<CatalogErrorResponse>;
                userMessage = data.userMessage || data.message || fallbackMessage;
                severity = data.severity || 'error';
            }
            // Error object with message
            else if (err.message) {
                userMessage = err.message;
            }
        }
    } catch {
        // JSON parsing failed, use fallback
    }

    // Map severity to sonner toast type
    switch (severity) {
        case 'info':
            toast.info(userMessage);
            break;
        case 'warning':
            toast.warning(userMessage);
            break;
        case 'critical':
        case 'error':
        default:
            toast.error(userMessage);
            break;
    }
}

/**
 * Wrapper for fetch that auto-handles error responses.
 * Throws with the parsed error body for catch blocks.
 */
export async function apiFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    const response = await fetch(url, options);

    if (!response.ok) {
        // Clone response so we can both read and re-throw
        const errorBody = await response.json().catch(() => ({}));
        const userMessage = errorBody.userMessage || errorBody.message || `Request failed (${response.status})`;
        const severity = errorBody.severity || 'error';

        // Show toast
        switch (severity) {
            case 'info':
                toast.info(userMessage);
                break;
            case 'warning':
                toast.warning(userMessage);
                break;
            default:
                toast.error(userMessage);
                break;
        }

        // Throw enriched error for catch blocks
        const enrichedError = new Error(userMessage) as any;
        enrichedError.statusCode = response.status;
        enrichedError.errorCode = errorBody.errorCode;
        enrichedError.severity = severity;
        enrichedError.context = errorBody.context;
        throw enrichedError;
    }

    return response;
}
