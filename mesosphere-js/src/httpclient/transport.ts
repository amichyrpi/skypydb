import { HttpTransportError } from "../errors";

type HttpMethod = "GET" | "POST" | "DELETE";

export type HttpClientTransportOptions = {
  api_url: string;
  api_key: string;
  timeout_ms?: number;
};

function normalize_api_url(api_url: string): string {
  const value = api_url.trim();
  if (value.length === 0) {
    throw new Error("api_url must be a non-empty string.");
  }
  return value.replace(/\/+$/, "");
}

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
};

export class HttpTransport {
  private readonly api_url: string;
  private readonly api_key: string;
  private readonly timeout_ms: number;

  constructor(options: HttpClientTransportOptions) {
    this.api_url = normalize_api_url(options.api_url);
    this.api_key = options.api_key.trim();
    this.timeout_ms = options.timeout_ms ?? 30_000;

    if (this.api_key.length === 0) {
      throw new Error("api_key must be a non-empty string.");
    }
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout_ms);

    try {
      const response = await fetch(`${this.api_url}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.api_key,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const raw_body = await response.text();
      const parsed = this.parse_json(raw_body);

      if (!response.ok) {
        const error_body = (parsed ?? {}) as ApiErrorBody;
        throw new HttpTransportError(
          response.status,
          error_body.error ?? "HttpError",
          error_body.message ?? response.statusText,
          parsed ?? raw_body,
        );
      }

      if (parsed && typeof parsed === "object" && "ok" in parsed) {
        const envelope = parsed as ApiEnvelope<T>;
        if (!envelope.ok) {
          throw new HttpTransportError(
            response.status,
            "ApiEnvelopeError",
            "Request failed with ok=false response.",
            parsed,
          );
        }
        return envelope.data;
      }

      return parsed as T;
    } catch (error) {
      if (error instanceof HttpTransportError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpTransportError(
          408,
          "RequestTimeout",
          `Request timed out after ${this.timeout_ms}ms.`,
        );
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpTransportError(0, "NetworkError", message);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parse_json(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }
}
