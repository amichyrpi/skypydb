import { SQL_INJECTION_PATTERNS } from "../../../security/constants";

export class SQLInjectionCheckMixin {
  static _contains_sql_injection(value: string): boolean {
    const upper = value.toUpperCase();
    return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(upper));
  }
}
