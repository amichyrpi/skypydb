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

export class TableNotFoundError extends SkypydbError {
  code(): number {
    return 404;
  }

  static error_name(): string {
    return "Table not found.";
  }
}

export class TableAlreadyExistsError extends SkypydbError {
  code(): number {
    return 502;
  }

  static error_name(): string {
    return "Table already exists.";
  }
}

export class DatabaseError extends SkypydbError {
  code(): number {
    return 513;
  }

  static error_name(): string {
    return "Database operation failed.";
  }
}

export class SchemaMismatchError extends SkypydbError {
  code(): number {
    return 514;
  }

  static error_name(): string {
    return "Schema mismatch.";
  }
}

export class SchemaLoadError extends SkypydbError {
  code(): number {
    return 515;
  }

  static error_name(): string {
    return "Schema loading failed.";
  }
}

export class FunctionResolutionError extends SkypydbError {
  code(): number {
    return 516;
  }

  static error_name(): string {
    return "Function resolution failed.";
  }
}

export class ConstraintError extends SkypydbError {
  code(): number {
    return 517;
  }

  static error_name(): string {
    return "Constraint validation failed.";
  }
}

export class InvalidSearchError extends SkypydbError {
  code(): number {
    return 501;
  }

  static error_name(): string {
    return "One or more search parameters are invalid.";
  }
}

export class SecurityError extends SkypydbError {
  code(): number {
    return 302;
  }

  static error_name(): string {
    return "Security operation failed.";
  }
}

export class ValidationError extends SkypydbError {
  code(): number {
    return 507;
  }

  static error_name(): string {
    return "Input validation failed.";
  }
}

export class CollectionNotFoundError extends SkypydbError {
  code(): number {
    return 404;
  }

  static error_name(): string {
    return "Collection not found.";
  }
}

export class CollectionAlreadyExistsError extends SkypydbError {
  code(): number {
    return 402;
  }

  static error_name(): string {
    return "Collection already exists.";
  }
}

export class EmbeddingError extends SkypydbError {
  code(): number {
    return 503;
  }

  static error_name(): string {
    return "Embedding generation failed.";
  }
}

export class VectorSearchError extends SkypydbError {
  code(): number {
    return 509;
  }

  static error_name(): string {
    return "Vector similarity search failed.";
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
