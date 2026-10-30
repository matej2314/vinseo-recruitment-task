import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { HttpErrorBody } from '@vinseo/contracts';

/** ValidationPipe zgodny z SPEC-KOMUNIKACJA K-8 (`code: VALIDATION_ERROR`). */
export function createApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: () => {
      const body: HttpErrorBody = {
        statusCode: 400,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
      };
      return new BadRequestException(body);
    },
  });
}
