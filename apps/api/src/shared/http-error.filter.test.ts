import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpErrorFilter } from "./http-error.filter";

function mockHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) })
  } as never;
  return { host, status, json };
}

describe("HttpErrorFilter", () => {
  it("maps ZodError to 400 validation_error with field issues", () => {
    const { host, status, json } = mockHost();
    const error = z.object({ startingBalance: z.number().positive() }).safeParse({ startingBalance: 0 });
    expect(error.success).toBe(false);

    new HttpErrorFilter().catch(error.success ? null : error.error, host);

    expect(status).toHaveBeenCalledWith(400);
    const payload = json.mock.calls[0][0];
    expect(payload.error.code).toBe("validation_error");
    expect(Array.isArray(payload.error.details)).toBe(true);
    expect(payload.error.details.length).toBeGreaterThan(0);
  });

  it("maps a cross-realm ZodError (different module instance) to 400 via structural detection", () => {
    const { host, status, json } = mockHost();
    // Simulate a ZodError thrown by a different zod copy (ESM vs CJS): same shape,
    // but not `instanceof` this module's ZodError.
    const foreign = new Error("validation failed");
    foreign.name = "ZodError";
    (foreign as unknown as { issues: unknown[] }).issues = [{ path: ["startingBalance"], message: "Too small" }];

    new HttpErrorFilter().catch(foreign, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.code).toBe("validation_error");
  });

  it("maps BadRequestException to 400 validation_error", () => {
    const { host, status, json } = mockHost();
    new HttpErrorFilter().catch(new BadRequestException("bad"), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].error.code).toBe("validation_error");
  });

  it("maps other HttpException to its status with request_error", () => {
    const { host, status, json } = mockHost();
    new HttpErrorFilter().catch(new NotFoundException("missing"), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error.code).toBe("request_error");
  });

  it("maps unknown errors to 500 internal_error", () => {
    const { host, status, json } = mockHost();
    new HttpErrorFilter().catch(new Error("boom"), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0].error.code).toBe("internal_error");
  });
});
