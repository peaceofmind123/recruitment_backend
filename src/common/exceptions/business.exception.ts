import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
    constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
        super(
            {
                statusCode: status,
                message,
                error: 'Business Error',
            },
            status,
        );
    }
} 