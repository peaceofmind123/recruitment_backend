import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');
    private readonly isDebug: boolean;

    constructor(private configService: ConfigService) {
        this.isDebug = this.configService.get<string>('LOG_LEVEL') === 'debug';
    }

    private safeStringify(obj: any): string {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return '[Unable to stringify body]';
        }
    }

    private getRequestBody(req: Request): string | undefined {
        if (!req.body || Object.keys(req.body).length === 0) {
            return undefined;
        }

        // Check if content-type is JSON
        const contentType = req.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
            return this.safeStringify(req.body);
        }

        return this.safeStringify(req.body);
    }

    private getResponseBody(body: any): string {
        try {
            // If body is already a string, try to parse it as JSON
            if (typeof body === 'string') {
                try {
                    const parsed = JSON.parse(body);
                    return this.safeStringify(parsed);
                } catch {
                    return body;
                }
            }
            return this.safeStringify(body);
        } catch (error) {
            return '[Unable to stringify response]';
        }
    }

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        const startTime = Date.now();

        // Log request
        if (this.isDebug) {
            const requestBody = this.getRequestBody(req);
            this.logger.debug(
                `Incoming Request: ${method} ${originalUrl}`,
                requestBody ? `\nBody: ${requestBody}` : '',
            );
        }

        // Capture response
        const originalSend = res.send;
        res.send = function (body: any) {
            const responseTime = Date.now() - startTime;

            if (this.isDebug) {
                const responseBody = this.getResponseBody(body);
                this.logger.debug(
                    `Outgoing Response: ${method} ${originalUrl} - ${res.statusCode} - ${responseTime}ms`,
                    `\nBody: ${responseBody}`,
                );
            }

            return originalSend.call(this, body);
        }.bind(this);

        next();
    }
} 