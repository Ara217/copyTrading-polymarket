import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { failure } from "@polyand/shared";
import { ZodError } from "zod";

// Detect ZodError structurally rather than via `instanceof`. @polyand/shared is an
// ESM package and loads zod's ESM build, while this API is CommonJS and loads zod's
// CJS build — two distinct ZodError classes, so cross-realm `instanceof` is unreliable.
function isZodError(exception: unknown): exception is ZodError {
  return (
    exception instanceof ZodError ||
    (exception instanceof Error &&
      exception.name === "ZodError" &&
      Array.isArray((exception as { issues?: unknown }).issues))
  );
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (isZodError(exception)) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .json(failure("validation_error", "Invalid request input", exception.issues));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(
        failure(
          status === HttpStatus.BAD_REQUEST ? "validation_error" : "request_error",
          exception.message
        )
      );
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(failure("internal_error", "Unexpected server error"));
  }
}

