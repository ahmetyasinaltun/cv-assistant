// Server-side HTTP client for the FastAPI backend: adds the bearer token and turns the error envelope into ApiError.
// Only server code imports this module, so the token and the API address never reach the browser.

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

/** A failed API call, carrying the backend's stable error code (`{"error": {"code", "message"}}`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Status used when the backend could not be reached at all. */
export const NETWORK_ERROR_STATUS = 0;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  json?: unknown;
  formData?: FormData;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options, "application/json");
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** For files (a PDF, a page image): the raw response, so a route handler can pass its body and headers on. */
export async function apiFileRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  return send(path, options, "*/*");
}

async function send(path: string, options: RequestOptions, accept: string): Promise<Response> {
  const headers = new Headers({ Accept: accept });
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // fetch sets the multipart boundary itself
  } else if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, "network_error", "The API could not be reached.");
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { error?: { code?: string; message?: string } };
    if (payload.error?.code) {
      return new ApiError(response.status, payload.error.code, payload.error.message ?? "");
    }
  } catch {
    // Not the JSON error envelope (e.g. a proxy error page); fall through to a status-based code.
  }
  return new ApiError(response.status, `http_${response.status}`, response.statusText);
}
