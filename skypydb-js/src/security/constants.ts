export const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
export const COLUMN_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const MAX_TABLE_NAME_LENGTH = 64;
export const MAX_COLUMN_NAME_LENGTH = 64;
export const MAX_STRING_LENGTH = 10000;

export const SQL_INJECTION_PATTERNS = [
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /;\s*UPDATE\s+/i,
  /;\s*INSERT\s+INTO/i,
  /--/i,
  /\/\*/i,
  /\*\//i,
  /xp_/i,
  /sp_/i,
  /EXEC\s*\(/i,
  /EXECUTE\s*\(/i,
  /UNION\s+SELECT/i,
  /INTO\s+OUTFILE/i,
  /LOAD_FILE/i
];
