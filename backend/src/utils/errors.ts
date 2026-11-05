// Application error with an HTTP status. Thrown anywhere below the controllers and turned into a
// consistent JSON response by the central error handler.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Per-field validation messages, keyed by field path. */
    public fields?: Record<string, string>,
    /** Stable machine-readable code the client can branch on (e.g. OUT_OF_STOCK). */
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new ApiError(400, message, fields);
export const unauthorized = (message = 'Please sign in to continue') => new ApiError(401, message);
export const forbidden = (message = 'You do not have permission to do that') => new ApiError(403, message);
export const notFound = (what = 'Resource') => new ApiError(404, `${what} not found`);
export const conflict = (message: string, code?: string) => new ApiError(409, message, undefined, code);
