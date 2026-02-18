export class SanitizeValuesMixin {
  static sanitize_string(value: unknown): string {
    if (typeof value !== "string") {
      return String(value);
    }
    return value.replace(/\0/g, "");
  }
}

export function sanitize_input(value: unknown): unknown {
  if (typeof value === "string") {
    return SanitizeValuesMixin.sanitize_string(value);
  }
  return value;
}
