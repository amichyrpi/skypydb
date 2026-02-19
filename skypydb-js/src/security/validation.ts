import {
  SanitizeValuesMixin,
  SQLInjectionCheckMixin,
  ValidateInputsMixin,
  sanitize_input,
  validate_column_name,
  validate_table_name,
} from "./mixins/validation";

export class InputValidator extends ValidateInputsMixin {}

export {
  sanitize_input,
  validate_column_name,
  validate_table_name,
  SanitizeValuesMixin,
  SQLInjectionCheckMixin,
  ValidateInputsMixin,
};
