import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type {
  FunctionArgsDefinition,
  FunctionsManifest,
  FunctionStep,
  RuntimeFunctionDefinition,
} from "./types";
import type { SchemaFieldDefinition } from "../types";

type LiteralValue =
  | string
  | number
  | boolean
  | null
  | LiteralValue[]
  | { [key: string]: LiteralValue };

type ConstantMap = Map<string, LiteralValue>;

export type BuildFunctionsManifestOptions = {
  cwd?: string;
  source_dir?: string;
  output_path?: string;
};

export type BuildFunctionsManifestResult = {
  source_dir: string;
  output_path: string;
  function_count: number;
  source_files: number;
  manifest: FunctionsManifest;
};

function to_posix_path(value: string): string {
  return value.replace(/\\/g, "/");
}

function collect_ts_files(root: string): string[] {
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full_path = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".generated" || entry.name === "node_modules") {
          continue;
        }
        stack.push(full_path);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (entry.name.endsWith(".d.ts")) {
        continue;
      }
      if (entry.name.endsWith(".ts")) {
        files.push(full_path);
      }
    }
  }
  files.sort();
  return files;
}

function parse_property_name(name: ts.PropertyName): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  if (ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw new Error("Only identifier/string/number property names are supported.");
}

function assert_call_args_length(
  method_name: string,
  call_expression: ts.CallExpression,
  expected_length: number,
): void {
  if (call_expression.arguments.length !== expected_length) {
    throw new Error(
      `value.${method_name} expects ${expected_length} argument(s).`,
    );
  }
}

function parse_field_definition(
  expression: ts.Expression,
  constants: ConstantMap,
): SchemaFieldDefinition {
  if (ts.isIdentifier(expression)) {
    const constant = constants.get(expression.text);
    if (!constant || typeof constant !== "object" || Array.isArray(constant)) {
      throw new Error(`Unknown field definition identifier '${expression.text}'.`);
    }
    return constant as unknown as SchemaFieldDefinition;
  }

  if (!ts.isCallExpression(expression)) {
    throw new Error("Field definitions must use value.* helper calls.");
  }

  if (!ts.isPropertyAccessExpression(expression.expression)) {
    throw new Error("Field definitions must use value.* helper calls.");
  }
  if (!ts.isIdentifier(expression.expression.expression)) {
    throw new Error("Invalid value helper usage.");
  }
  if (expression.expression.expression.text !== "value") {
    throw new Error("Field definitions must use value.* helper calls.");
  }

  const method_name = expression.expression.name.text;
  if (method_name === "string") {
    assert_call_args_length(method_name, expression, 0);
    return { type: "string" };
  }
  if (method_name === "number") {
    assert_call_args_length(method_name, expression, 0);
    return { type: "number" };
  }
  if (method_name === "boolean") {
    assert_call_args_length(method_name, expression, 0);
    return { type: "boolean" };
  }
  if (method_name === "id") {
    assert_call_args_length(method_name, expression, 1);
    const table_name = parse_literal_expression(
      expression.arguments[0],
      constants,
    );
    if (typeof table_name !== "string" || table_name.length === 0) {
      throw new Error("value.id(table) expects a non-empty string table name.");
    }
    return {
      type: "id",
      table: table_name,
    };
  }
  if (method_name === "object") {
    assert_call_args_length(method_name, expression, 1);
    const shape_expression = expression.arguments[0];
    if (!ts.isObjectLiteralExpression(shape_expression)) {
      throw new Error("value.object(shape) expects an object literal.");
    }
    const shape: Record<string, SchemaFieldDefinition> = {};
    for (const property of shape_expression.properties) {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error("value.object(shape) supports property assignments only.");
      }
      const key = parse_property_name(property.name);
      shape[key] = parse_field_definition(property.initializer, constants);
    }
    return {
      type: "object",
      shape,
    };
  }
  if (method_name === "optional") {
    assert_call_args_length(method_name, expression, 1);
    return {
      type: "optional",
      inner: parse_field_definition(expression.arguments[0], constants),
    };
  }

  throw new Error(`Unsupported value helper 'value.${method_name}'.`);
}

function parse_object_literal(
  expression: ts.ObjectLiteralExpression,
  constants: ConstantMap,
): { [key: string]: LiteralValue } {
  const output: { [key: string]: LiteralValue } = {};
  for (const property of expression.properties) {
    if (ts.isPropertyAssignment(property)) {
      const key = parse_property_name(property.name);
      output[key] = parse_literal_expression(property.initializer, constants);
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      const key = property.name.text;
      const constant = constants.get(key);
      if (constant === undefined) {
        throw new Error(`Unknown shorthand property '${key}'.`);
      }
      output[key] = constant;
      continue;
    }
    throw new Error("Unsupported object literal syntax in function DSL.");
  }
  return output;
}

function parse_literal_expression(
  expression: ts.Expression,
  constants: ConstantMap,
): LiteralValue {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isParenthesizedExpression(expression)) {
    return parse_literal_expression(expression.expression, constants);
  }
  if (ts.isAsExpression(expression)) {
    return parse_literal_expression(expression.expression, constants);
  }
  if (ts.isSatisfiesExpression(expression)) {
    return parse_literal_expression(expression.expression, constants);
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    if (
      expression.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(expression.operand)
    ) {
      return -Number(expression.operand.text);
    }
    throw new Error("Unsupported unary expression in function DSL.");
  }
  if (ts.isIdentifier(expression)) {
    if (expression.text === "undefined") {
      return null;
    }
    const constant = constants.get(expression.text);
    if (constant !== undefined) {
      return constant;
    }
    throw new Error(`Unknown identifier '${expression.text}' in function DSL.`);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) => {
      if (!ts.isExpression(element)) {
        throw new Error("Unsupported array element in function DSL.");
      }
      return parse_literal_expression(element, constants);
    });
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return parse_object_literal(expression, constants);
  }
  if (ts.isCallExpression(expression)) {
    return parse_field_definition(expression, constants) as unknown as LiteralValue;
  }

  throw new Error(
    `Unsupported syntax kind '${ts.SyntaxKind[expression.kind]}' in function DSL.`,
  );
}

function parse_function_options(
  call_expression: ts.CallExpression,
  constants: ConstantMap,
): RuntimeFunctionDefinition {
  if (call_expression.arguments.length !== 1) {
    throw new Error("queryFunction/mutationFunction expects one options object.");
  }
  const options_literal = parse_literal_expression(
    call_expression.arguments[0],
    constants,
  );
  if (
    typeof options_literal !== "object" ||
    options_literal === null ||
    Array.isArray(options_literal)
  ) {
    throw new Error("Function options must be an object literal.");
  }

  const options = options_literal as Record<string, LiteralValue>;
  const args_value = options.args ?? {};
  const steps_value = options.steps ?? [];

  if (
    typeof args_value !== "object" ||
    args_value === null ||
    Array.isArray(args_value)
  ) {
    throw new Error("Function args must be an object.");
  }
  if (!Array.isArray(steps_value)) {
    throw new Error("Function steps must be an array.");
  }

  const args = args_value as unknown as FunctionArgsDefinition;
  const steps = steps_value as unknown as FunctionStep[];
  for (const step of steps) {
    if (typeof step !== "object" || step === null || Array.isArray(step)) {
      throw new Error("Every step must be an object.");
    }
    if (typeof (step as { op?: unknown }).op !== "string") {
      throw new Error("Every step must define an 'op' string.");
    }
  }

  return {
    kind: "query",
    args,
    steps,
  };
}

function parse_exported_functions(
  file_path: string,
  source_root: string,
): Record<string, RuntimeFunctionDefinition> {
  const source_text = fs.readFileSync(file_path, "utf8");
  const source_file = ts.createSourceFile(
    file_path,
    source_text,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );

  const constants: ConstantMap = new Map();
  for (const statement of source_file.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const is_const = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
    if (!is_const) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }
      try {
        const parsed = parse_literal_expression(declaration.initializer, constants);
        constants.set(declaration.name.text, parsed);
      } catch {
        // ignore non-literal constants in pre-pass
      }
    }
  }

  const module_relative = to_posix_path(path.relative(source_root, file_path)).replace(
    /\.ts$/,
    "",
  );
  const module_key = module_relative.endsWith("/index")
    ? module_relative.slice(0, -"/index".length)
    : module_relative;
  const module_prefix = module_key.length > 0 ? module_key.replace(/\//g, ".") : "";

  const functions: Record<string, RuntimeFunctionDefinition> = {};
  for (const statement of source_file.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    const is_exported =
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ?? false;
    if (!is_exported) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
        continue;
      }
      if (!ts.isCallExpression(declaration.initializer)) {
        continue;
      }
      const call_expression = declaration.initializer;
      if (!ts.isIdentifier(call_expression.expression)) {
        continue;
      }

      const helper_name = call_expression.expression.text;
      if (helper_name !== "queryFunction" && helper_name !== "mutationFunction") {
        continue;
      }

      const parsed = parse_function_options(call_expression, constants);
      parsed.kind = helper_name === "queryFunction" ? "query" : "mutation";

      const endpoint = module_prefix.length
        ? `${module_prefix}.${declaration.name.text}`
        : declaration.name.text;
      if (functions[endpoint]) {
        throw new Error(
          `Duplicate function endpoint '${endpoint}' in file '${file_path}'.`,
        );
      }
      functions[endpoint] = parsed;
    }
  }

  return functions;
}

function write_json_file(target_path: string, value: unknown): void {
  fs.mkdirSync(path.dirname(target_path), { recursive: true });
  fs.writeFileSync(target_path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function build_functions_manifest(
  options: BuildFunctionsManifestOptions = {},
): BuildFunctionsManifestResult {
  const cwd = options.cwd ?? process.cwd();
  const source_dir = options.source_dir ?? path.join(cwd, "skypydb");
  const output_path =
    options.output_path ??
    path.join(source_dir, ".generated", "functions.manifest.json");

  if (!fs.existsSync(source_dir)) {
    throw new Error(`Function source directory not found: '${source_dir}'.`);
  }

  const files = collect_ts_files(source_dir);
  const functions: Record<string, RuntimeFunctionDefinition> = {};
  for (const file_path of files) {
    const parsed = parse_exported_functions(file_path, source_dir);
    for (const [endpoint, definition] of Object.entries(parsed)) {
      if (functions[endpoint]) {
        throw new Error(`Duplicate function endpoint '${endpoint}'.`);
      }
      functions[endpoint] = definition;
    }
  }

  const manifest: FunctionsManifest = {
    version: 1,
    functions,
  };
  write_json_file(output_path, manifest);

  return {
    source_dir,
    output_path,
    function_count: Object.keys(functions).length,
    source_files: files.length,
    manifest,
  };
}
