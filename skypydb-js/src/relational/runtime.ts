import path from "node:path";
import { ConstraintError, FunctionResolutionError, ValidationError } from "../errors";
import { endpoint_from_reference } from "./api_proxy";
import { RelationalDatabase } from "./database";
import { discover_endpoints } from "./function_registry";
import { load_schema } from "./schema_loader";
import type {
  EndpointDescriptor,
  MutationContext,
  MutationDefinition,
  QueryContext,
  QueryDefinition,
  RuntimeSchemaOptions,
  ValueDefinition
} from "./types";

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class RelationalRuntime {
  private database: RelationalDatabase | null = null;
  private endpoints = new Map<string, EndpointDescriptor>();
  private schema_options: RuntimeSchemaOptions = {};
  private loaded_project_root: string | null = null;

  set_schema_options(options: RuntimeSchemaOptions = {}): void {
    this.schema_options = {
      ...this.schema_options,
      ...options
    };
  }

  callquery(reference: unknown, args: unknown): unknown {
    this.ensure_initialized();
    const descriptor = this.resolve_endpoint(reference, "query");
    const definition = descriptor.definition as QueryDefinition;
    const validated_args = this.validate_args(definition.args, args, descriptor.endpoint);
    const context: QueryContext = {
      db: this.get_database().create_readonly_context()
    };
    return definition.handler(context, validated_args);
  }

  callmutation(reference: unknown, args: unknown): unknown {
    this.ensure_initialized();
    const descriptor = this.resolve_endpoint(reference, "mutation");
    const definition = descriptor.definition as MutationDefinition;
    const validated_args = this.validate_args(definition.args, args, descriptor.endpoint);
    const context: MutationContext = {
      db: this.get_database().create_mutation_context()
    };
    return definition.handler(context, validated_args);
  }

  reset_for_tests(): void {
    if (this.database) {
      this.database.close();
    }
    this.database = null;
    this.endpoints = new Map();
    this.loaded_project_root = null;
    this.schema_options = {};
  }

  private ensure_initialized(): void {
    const project_root = process.cwd();
    if (this.loaded_project_root !== project_root) {
      if (this.database) {
        this.database.close();
      }
      this.database = null;
      this.endpoints = new Map();
      this.loaded_project_root = project_root;
    }

    const schema = load_schema(project_root);
    const db = this.get_or_create_database(project_root);
    db.apply_schema(schema, this.schema_options);
    this.endpoints = discover_endpoints(project_root);
  }

  private get_or_create_database(project_root: string): RelationalDatabase {
    if (!this.database) {
      const db_path = path.join(project_root, "skypydb", "reactive.db");
      this.database = new RelationalDatabase(db_path);
    }
    return this.database;
  }

  private get_database(): RelationalDatabase {
    if (!this.database) {
      throw new ConstraintError("Relational runtime is not initialized.");
    }
    return this.database;
  }

  private resolve_endpoint(reference: unknown, expected_kind: "query" | "mutation"): EndpointDescriptor {
    const endpoint = endpoint_from_reference(reference);
    const descriptor = this.endpoints.get(endpoint);
    if (!descriptor) {
      const known = [...this.endpoints.keys()].sort();
      const preview = known.length === 0 ? "none" : known.slice(0, 12).join(", ");
      throw new FunctionResolutionError(
        `Endpoint '${endpoint}' was not found. Known endpoints: ${preview}`
      );
    }
    if (descriptor.kind !== expected_kind) {
      throw new FunctionResolutionError(
        `Endpoint '${endpoint}' is a ${descriptor.kind}, not a ${expected_kind}.`
      );
    }
    return descriptor;
  }

  private validate_args(
    args_definition: Record<string, ValueDefinition> | undefined,
    args: unknown,
    endpoint: string
  ): unknown {
    if (!args_definition) {
      return args;
    }

    if (args === undefined || args === null) {
      if (Object.keys(args_definition).length === 0) {
        return {};
      }
      throw new ValidationError(`Endpoint '${endpoint}' requires an args object.`);
    }
    if (!is_plain_object(args)) {
      throw new ValidationError(`Endpoint '${endpoint}' args must be an object.`);
    }

    const normalized: Record<string, unknown> = {};
    for (const [field_name, definition] of Object.entries(args_definition)) {
      const has_value = Object.prototype.hasOwnProperty.call(args, field_name);
      if (!has_value || args[field_name] === undefined) {
        if (definition.kind === "optional") {
          normalized[field_name] = undefined;
          continue;
        }
        throw new ValidationError(
          `Missing required argument '${field_name}' for endpoint '${endpoint}'.`
        );
      }
      normalized[field_name] = this.validate_arg_value(
        definition,
        args[field_name],
        `${endpoint}.args.${field_name}`
      );
    }

    for (const provided_field of Object.keys(args)) {
      if (!Object.prototype.hasOwnProperty.call(args_definition, provided_field)) {
        throw new ValidationError(
          `Unknown argument '${provided_field}' for endpoint '${endpoint}'.`
        );
      }
    }

    return normalized;
  }

  private validate_arg_value(definition: ValueDefinition, value: unknown, path_name: string): unknown {
    if (definition.kind === "optional") {
      if (value === null || value === undefined) {
        return undefined;
      }
      return this.validate_arg_value(definition.inner, value, path_name);
    }

    if (value === null || value === undefined) {
      throw new ValidationError(`Argument '${path_name}' cannot be null.`);
    }

    if (definition.kind === "string") {
      if (typeof value !== "string") {
        throw new ValidationError(`Argument '${path_name}' must be a string.`);
      }
      return value;
    }
    if (definition.kind === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ValidationError(`Argument '${path_name}' must be a finite number.`);
      }
      return value;
    }
    if (definition.kind === "boolean") {
      if (typeof value !== "boolean") {
        throw new ValidationError(`Argument '${path_name}' must be a boolean.`);
      }
      return value;
    }
    if (definition.kind === "id") {
      if (typeof value !== "string" || value.length === 0) {
        throw new ValidationError(`Argument '${path_name}' must be a non-empty string id.`);
      }
      return value;
    }
    if (definition.kind === "object") {
      if (!is_plain_object(value)) {
        throw new ValidationError(`Argument '${path_name}' must be an object.`);
      }
      const normalized: Record<string, unknown> = {};
      for (const [key, nested_definition] of Object.entries(definition.shape)) {
        const has_nested = Object.prototype.hasOwnProperty.call(value, key);
        if (!has_nested || value[key] === undefined) {
          if (nested_definition.kind === "optional") {
            normalized[key] = undefined;
            continue;
          }
          throw new ValidationError(`Missing required argument '${path_name}.${key}'.`);
        }
        normalized[key] = this.validate_arg_value(
          nested_definition,
          value[key],
          `${path_name}.${key}`
        );
      }
      for (const provided_key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(definition.shape, provided_key)) {
          throw new ValidationError(`Unknown argument '${path_name}.${provided_key}'.`);
        }
      }
      return normalized;
    }
    return value;
  }
}

const runtime_singleton = new RelationalRuntime();

export function set_schema_runtime_options(options: RuntimeSchemaOptions = {}): void {
  runtime_singleton.set_schema_options(options);
}

export function callquery_runtime(reference: unknown, args: unknown): unknown {
  return runtime_singleton.callquery(reference, args);
}

export function callmutation_runtime(reference: unknown, args: unknown): unknown {
  return runtime_singleton.callmutation(reference, args);
}

export function __reset_runtime_for_tests(): void {
  runtime_singleton.reset_for_tests();
}

