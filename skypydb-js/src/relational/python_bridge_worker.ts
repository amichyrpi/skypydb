import readline from "node:readline";
import { api } from "./api_proxy";
import { callquery } from "../query/callquery";
import { callmutation } from "../mutation/callmutation";
import { callschemas } from "../schemas/callschemas";

type BridgeAction =
  | "init"
  | "ping"
  | "callschemas"
  | "callquery"
  | "callmutation"
  | "shutdown";

type BridgeRequest = {
  id: string | number | null;
  action: BridgeAction;
  payload?: unknown;
};

type BridgeError = {
  name: string;
  message: string;
  stack: string | null;
  code: number | null;
};

type BridgeSuccessResponse = {
  id: string | number | null;
  ok: true;
  result: unknown;
};

type BridgeFailureResponse = {
  id: string | number | null;
  ok: false;
  error: BridgeError;
};

export type BridgeResponse = BridgeSuccessResponse | BridgeFailureResponse;

export type BridgeWorkerState = {
  initialized: boolean;
  project_root: string | null;
};

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error_code(value: unknown): number | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const with_method = value as { code?: unknown };
  if (typeof with_method.code === "function") {
    try {
      const next = with_method.code();
      return typeof next === "number" ? next : null;
    } catch {
      return null;
    }
  }
  if (typeof with_method.code === "number") {
    return with_method.code;
  }
  return null;
}

function to_bridge_error(error: unknown): BridgeError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      code: error_code(error),
    };
  }
  return {
    name: "Error",
    message: String(error),
    stack: null,
    code: null,
  };
}

function extract_payload_object(
  payload: unknown,
  action: BridgeAction,
): Record<string, unknown> {
  if (!is_plain_object(payload)) {
    throw new Error(`Action '${action}' requires an object payload.`);
  }
  return payload;
}

export function resolve_api_reference(endpoint: string): unknown {
  if (typeof endpoint !== "string" || endpoint.trim().length === 0) {
    throw new Error("Endpoint must be a non-empty string.");
  }

  const parts = endpoint
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < 2) {
    throw new Error("Endpoint must use module.function format.");
  }

  let reference: unknown = api;
  for (const part of parts) {
    reference = (reference as Record<string, unknown>)[part];
  }
  return reference;
}

async function execute_action(
  request: BridgeRequest,
  state: BridgeWorkerState,
): Promise<unknown> {
  if (request.action === "ping") {
    return "pong";
  }

  if (request.action === "init") {
    const payload = extract_payload_object(request.payload, "init");
    const project_root = payload.projectRoot;
    if (typeof project_root !== "string" || project_root.length === 0) {
      throw new Error("init requires payload.projectRoot as a non-empty string.");
    }
    if (state.initialized && state.project_root !== project_root) {
      throw new Error(
        `Worker is already initialized for '${state.project_root}'. Restart worker to change projectRoot.`,
      );
    }

    process.chdir(project_root);
    state.initialized = true;
    state.project_root = project_root;
    return {
      projectRoot: project_root,
    };
  }

  if (request.action === "shutdown") {
    return { shuttingDown: true };
  }

  if (!state.initialized) {
    throw new Error("Worker must be initialized before relational calls.");
  }

  if (request.action === "callschemas") {
    const payload = extract_payload_object(request.payload, "callschemas");
    const options = payload.options ?? {};
    callschemas(options as Record<string, unknown>);
    return null;
  }

  if (request.action === "callquery" || request.action === "callmutation") {
    const payload = extract_payload_object(request.payload, request.action);
    const endpoint = payload.endpoint;
    if (typeof endpoint !== "string") {
      throw new Error(`${request.action} requires payload.endpoint as string.`);
    }
    const args = payload.args;
    const reference = resolve_api_reference(endpoint);

    if (request.action === "callquery") {
      return await Promise.resolve(callquery(reference, args));
    }
    return await Promise.resolve(callmutation(reference, args));
  }

  throw new Error(`Unsupported action '${request.action}'.`);
}

function parse_bridge_request(value: unknown): BridgeRequest {
  if (!is_plain_object(value)) {
    throw new Error("Bridge request must be an object.");
  }

  const action = value.action;
  if (typeof action !== "string") {
    throw new Error("Bridge request action must be a string.");
  }

  const allowed_actions: BridgeAction[] = [
    "init",
    "ping",
    "callschemas",
    "callquery",
    "callmutation",
    "shutdown",
  ];
  if (!allowed_actions.includes(action as BridgeAction)) {
    throw new Error(`Unknown bridge action '${action}'.`);
  }

  return {
    id:
      typeof value.id === "string" || typeof value.id === "number"
        ? value.id
        : null,
    action: action as BridgeAction,
    payload: value.payload,
  };
}

export async function handle_bridge_request(
  value: unknown,
  state: BridgeWorkerState,
): Promise<BridgeResponse> {
  const request = parse_bridge_request(value);

  try {
    const result = await execute_action(request, state);
    return {
      id: request.id,
      ok: true,
      result,
    };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: to_bridge_error(error),
    };
  }
}

function write_response(response: BridgeResponse): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

export async function run_python_bridge_worker(): Promise<void> {
  const state: BridgeWorkerState = {
    initialized: false,
    project_root: null,
  };

  const line_reader = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of line_reader) {
    const payload = line.trim();
    if (payload.length === 0) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch (error) {
      write_response({
        id: null,
        ok: false,
        error: to_bridge_error(error),
      });
      continue;
    }

    const response = await handle_bridge_request(parsed, state);
    write_response(response);

    if (
      response.ok &&
      is_plain_object(parsed) &&
      parsed.action === "shutdown"
    ) {
      break;
    }
  }

  line_reader.close();
}
