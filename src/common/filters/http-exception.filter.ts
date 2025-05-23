import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message || exception.message;
            error = exception.name;
        } else if (exception instanceof QueryFailedError) {
            // Handle TypeORM errors
            if (exception.message.includes('duplicate key value violates unique constraint')) {
                status = HttpStatus.CONFLICT;
                message = 'Resource already exists';
                error = 'Conflict';
            } else if (exception.message.includes('violates foreign key constraint')) {
                status = HttpStatus.BAD_REQUEST;
                message = 'Related resource not found';
                error = 'Bad Request';
            }
        }

        // Log the error
        this.logger.error(
            `${request.method} ${request.url} - ${status} - ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            error,
        });
    }
} 