import { describe, expect, it } from "vitest";
import {
  InputValidator,
  sanitize_input,
  validate_column_name,
  validate_table_name,
} from "../src/security";
import { ValidationError } from "../src/errors";

describe("validation", () => {
  it("validates table and column names", () => {
    expect(validate_table_name("my_table-1")).toBe("my_table-1");
    expect(validate_column_name("my_column_1")).toBe("my_column_1");
  });

  it("rejects invalid names", () => {
    expect(() => validate_table_name("1bad")).toThrow(ValidationError);
    expect(() => validate_column_name("bad-name")).toThrow(ValidationError);
  });

  it("sanitizes input values", () => {
    expect(sanitize_input("hello\0world")).toBe("helloworld");
    expect(sanitize_input(123)).toBe(123);
  });

  it("validates config dictionaries", () => {
    const config = {
      users: {
        name: "str",
        age: "int",
      },
    };
    expect(InputValidator.validate_config(config)).toEqual(config);
  });
});
