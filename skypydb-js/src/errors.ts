export class SkypydbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  code(): number {
    return 500;
  }

  static error_name(): string {
    return "Skypydb error";
  }
}

export class HttpTransportError extends SkypydbError {
  readonly status_code: number;
  readonly error_type: string;
  readonly response_body?: unknown;

  constructor(
    status_code: number,
    error_type: string,
    message: string,
    response_body?: unknown,
  ) {
    super(message);
    this.status_code = status_code;
    this.error_type = error_type;
    this.response_body = response_body;
  }

  code(): number {
    return this.status_code || 500;
  }

  static error_name(): string {
    return "HTTP transport error.";
  }
}
