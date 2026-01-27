// Application

export interface Fetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response>;
}

export interface APIError {
  code: string;
  message: string;
  cause?: unknown;
}

export interface APIResponse {
  data: unknown;
  error: APIError | null;
}
