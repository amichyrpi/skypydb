import type { SchemaDocument, SchemaFieldDefinition } from "../types";

export type FunctionKind = "query" | "mutation";

export type FunctionExpression =
  | string
  | number
  | boolean
  | null
  | FunctionExpression[]
  | { [key: string]: FunctionExpression };

export type BaseStep = {
  op: string;
  into?: string;
};

export type GetStep = BaseStep & {
  op: "get";
  table: string;
  where?: FunctionExpression;
  orderBy?: FunctionExpression;
  limit?: FunctionExpression;
  offset?: FunctionExpression;
};

export type FirstStep = BaseStep & {
  op: "first";
  table: string;
  where?: FunctionExpression;
  orderBy?: FunctionExpression;
  limit?: FunctionExpression;
  offset?: FunctionExpression;
};

export type CountStep = BaseStep & {
  op: "count";
  table: string;
  where?: FunctionExpression;
};

export type InsertStep = BaseStep & {
  op: "insert";
  table: string;
  value: FunctionExpression;
};

export type UpdateStep = BaseStep & {
  op: "update";
  table: string;
  id?: FunctionExpression;
  where?: FunctionExpression;
  value: FunctionExpression;
};

export type DeleteStep = BaseStep & {
  op: "delete";
  table: string;
  id?: FunctionExpression;
  where?: FunctionExpression;
};

export type MoveStep = BaseStep & {
  op: "move";
  table: string;
  toTable: FunctionExpression;
  id?: FunctionExpression;
  where?: FunctionExpression;
  fieldMap?: FunctionExpression;
  defaults?: FunctionExpression;
};

export type AssertStep = {
  op: "assert";
  condition: FunctionExpression;
  message: string;
};

export type SetVarStep = {
  op: "setVar";
  name: string;
  value: FunctionExpression;
};

export type ReturnStep = {
  op: "return";
  value: FunctionExpression;
};

export type ApplySchemaStep = BaseStep & {
  op: "applySchema";
  schema: SchemaDocument | FunctionExpression;
};

export type FunctionStep =
  | GetStep
  | FirstStep
  | CountStep
  | InsertStep
  | UpdateStep
  | DeleteStep
  | MoveStep
  | AssertStep
  | SetVarStep
  | ReturnStep
  | ApplySchemaStep;

export type FunctionArgsDefinition = Record<string, SchemaFieldDefinition>;

export type FunctionDefinition = {
  __skypydbFunction: true;
  kind: FunctionKind;
  args: FunctionArgsDefinition;
  steps: FunctionStep[];
};

export type QueryFunctionOptions = {
  args?: FunctionArgsDefinition;
  steps: FunctionStep[];
};

export type MutationFunctionOptions = {
  args?: FunctionArgsDefinition;
  steps: FunctionStep[];
};

export type RuntimeFunctionDefinition = {
  kind: FunctionKind;
  args: FunctionArgsDefinition;
  steps: FunctionStep[];
};

export type FunctionsManifest = {
  version: 1;
  functions: Record<string, RuntimeFunctionDefinition>;
};
