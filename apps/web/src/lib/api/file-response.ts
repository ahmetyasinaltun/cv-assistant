// Passes a file from the API (a PDF, a page image) through a route handler to the browser, which never holds the
// session token itself. Failures become a small JSON body with the API's error code and status.

import { ApiError, NETWORK_ERROR_STATUS } from "./client";

const PASSED_HEADERS = ["content-type", "content-disposition", "x-page-count", "cache-control"];

export async function passFile(load: () => Promise<Response>): Promise<Response> {
  try {
    const upstream = await load();
    const headers = new Headers();
    for (const name of PASSED_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const status = error instanceof ApiError && error.status !== NETWORK_ERROR_STATUS ? error.status : 502;
    const code = error instanceof ApiError ? error.code : "unexpected";
    if (!(error instanceof ApiError)) console.error("Passing a file from the API failed", error);
    return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
