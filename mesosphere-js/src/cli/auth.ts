import path from "node:path";

import type { CliDependencies } from "./dependencies";

const LOCAL_API_URL_DEFAULT = "http://localhost:8000";
const LOCAL_API_KEY_DEFAULT = "local-dev-key";

function escape_for_regex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quote_env_value(value: string): string {
  const escaped_backslashes = value.replace(/\\/g, "\\\\");
  const escaped_quotes = escaped_backslashes.replace(/"/g, '\\"');
  return `"${escaped_quotes}"`;
}

function upsert_env_key(content: string, key: string, value: string): string {
  const key_pattern = new RegExp(`^${escape_for_regex(key)}\\s*=\\s*.*$`, "m");
  const formatted_prefix = `${key}=${quote_env_value(value)}`;

  if (key_pattern.test(content)) {
    return content.replace(key_pattern, (line) => {
      const comment_index = line.indexOf(" #");
      if (comment_index === -1) {
        return formatted_prefix;
      }
      const comment = line.slice(comment_index + 1).trimStart();
      return `${formatted_prefix} ${comment}`;
    });
  }

  const separator =
    content === "" ? "" : content.endsWith("\n") ? "" : "\n";
  return `${content}${separator}${formatted_prefix}\n`;
}

export function configure_local_auth_env(dependencies: CliDependencies): number {
  const env_path = path.join(dependencies.cwd(), ".env");
  if (!dependencies.exists_sync(env_path)) {
    dependencies.error("Missing .env file in current directory.");
    return 1;
  }

  try {
    const current_content = dependencies.read_utf8(env_path);
    const api_url =
      dependencies.env_get("MESOSPHERE_API_URL")?.trim() || LOCAL_API_URL_DEFAULT;
    const api_key =
      dependencies.env_get("MESOSPHERE_API_KEY")?.trim() || LOCAL_API_KEY_DEFAULT;

    const with_api_url = upsert_env_key(current_content, "MESOSPHERE_API_URL", api_url);
    const with_api_key = upsert_env_key(with_api_url, "MESOSPHERE_API_KEY", api_key);
    dependencies.write_atomic(env_path, with_api_key);
    dependencies.log("Configured local MESOSPHERE API URL and API key in .env");
    return 0;
  } catch (error) {
    dependencies.error(`Failed to configure local auth in .env: ${String(error)}`);
    return 1;
  }
}

export function configure_cloud_auth_placeholder(
  dependencies: CliDependencies,
): number {
  dependencies.log("Cloud auth setup is not ready yet.");
  return 0;
}
