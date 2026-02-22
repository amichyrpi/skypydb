use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use skypydb_common::schema::types::{FieldDefinition, FieldType};
use skypydb_errors::AppError;

#[derive(Debug, Clone, Copy, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FunctionKind {
    Query,
    Mutation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestStep {
    pub op: String,
    #[serde(default)]
    pub into: Option<String>,
    #[serde(flatten)]
    pub payload: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestFunction {
    pub kind: FunctionKind,
    #[serde(default)]
    pub args: BTreeMap<String, FieldDefinition>,
    #[serde(default)]
    pub steps: Vec<ManifestStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionsManifest {
    pub version: u32,
    pub functions: BTreeMap<String, ManifestFunction>,
}

struct ParsedHandler {
    ctx_name: String,
    args_name: String,
    body: String,
}

pub fn load_functions_from_source(source_dir: &Path) -> Result<FunctionsManifest, AppError> {
    if !source_dir.exists() {
        return Err(AppError::not_found(format!(
            "functions source directory not found at '{}'",
            source_dir.display()
        )));
    }
    if !source_dir.is_dir() {
        return Err(AppError::validation(format!(
            "functions source path '{}' must be a directory",
            source_dir.display()
        )));
    }

    let files = collect_ts_files(source_dir)?;
    let mut functions = BTreeMap::<String, ManifestFunction>::new();
    for file in files {
        let parsed = parse_file_exports(&file, source_dir)?;
        for (endpoint, function) in parsed {
            if functions.contains_key(&endpoint) {
                return Err(AppError::validation(format!(
                    "duplicate function endpoint '{}'",
                    endpoint
                )));
            }
            functions.insert(endpoint, function);
        }
    }

    Ok(FunctionsManifest {
        version: 1,
        functions,
    })
}

fn collect_ts_files(root: &Path) -> Result<Vec<PathBuf>, AppError> {
    let mut stack = vec![root.to_path_buf()];
    let mut files = Vec::<PathBuf>::new();
    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current).map_err(|error| {
            AppError::internal(format!(
                "failed to read source directory '{}': {}",
                current.display(),
                error
            ))
        })?;
        for entry_result in entries {
            let entry = entry_result.map_err(|error| {
                AppError::internal(format!(
                    "failed to read source entry in '{}': {}",
                    current.display(),
                    error
                ))
            })?;
            let path = entry.path();
            let file_type = entry.file_type().map_err(|error| {
                AppError::internal(format!(
                    "failed to inspect source entry '{}': {}",
                    path.display(),
                    error
                ))
            })?;
            if file_type.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name != "node_modules" && name != ".generated" && name != "dist" {
                    stack.push(path);
                }
                continue;
            }
            if file_type.is_file() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".ts") && !name.ends_with(".d.ts") {
                    files.push(path);
                }
            }
        }
    }
    files.sort();
    Ok(files)
}

fn parse_file_exports(
    file_path: &Path,
    source_root: &Path,
) -> Result<BTreeMap<String, ManifestFunction>, AppError> {
    let text = fs::read_to_string(file_path).map_err(|error| {
        AppError::internal(format!(
            "failed to read source file '{}': {}",
            file_path.display(),
            error
        ))
    })?;

    let relative = file_path
        .strip_prefix(source_root)
        .map_err(|error| AppError::internal(error.to_string()))?
        .to_string_lossy()
        .replace('\\', "/");
    let mut module_key = relative.trim_end_matches(".ts").to_string();
    if module_key.ends_with("/index") {
        module_key = module_key.trim_end_matches("/index").to_string();
    }
    let module_prefix = module_key.replace('/', ".");

    let export_re = Regex::new(
        r"export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(readFunction|writeFunction)\s*\(\s*\{",
    )
    .map_err(|error| AppError::internal(format!("regex error: {}", error)))?;
    let close_re = Regex::new(r"^\s*\)\s*;")
        .map_err(|error| AppError::internal(format!("regex error: {}", error)))?;

    let mut out = BTreeMap::<String, ManifestFunction>::new();
    let mut cursor = 0usize;
    while let Some(caps) = export_re.captures(&text[cursor..]) {
        let full = caps
            .get(0)
            .ok_or_else(|| AppError::internal("invalid export match".to_string()))?;
        let export_name = caps
            .get(1)
            .map(|m| m.as_str().to_string())
            .ok_or_else(|| AppError::internal("missing export name".to_string()))?;
        let helper = caps
            .get(2)
            .map(|m| m.as_str())
            .ok_or_else(|| AppError::internal("missing helper".to_string()))?;
        let open_brace = cursor + full.end() - 1;
        let (options, close_brace) = extract_braced_block(&text, open_brace).map_err(|error| {
            AppError::validation(format!(
                "invalid function '{}' in '{}': {}",
                export_name,
                file_path.display(),
                error
            ))
        })?;
        let close_call = close_re.find(&text[close_brace + 1..]).ok_or_else(|| {
            AppError::validation(format!(
                "function '{}' in '{}' must end with ');'",
                export_name,
                file_path.display()
            ))
        })?;
        cursor = close_brace + 1 + close_call.end();

        let endpoint = if module_prefix.is_empty() {
            export_name.clone()
        } else {
            format!("{}.{}", module_prefix, export_name)
        };
        let kind = if helper == "readFunction" {
            FunctionKind::Query
        } else {
            FunctionKind::Mutation
        };
        out.insert(endpoint.clone(), parse_function_options(&options, kind, &endpoint)?);
    }

    Ok(out)
}

fn parse_function_options(
    options: &str,
    kind: FunctionKind,
    endpoint: &str,
) -> Result<ManifestFunction, AppError> {
    let args = parse_args(options).map_err(|error| {
        AppError::validation(format!("function '{}' has invalid args: {}", endpoint, error))
    })?;
    let handler = parse_handler(options).map_err(|error| {
        AppError::validation(format!("function '{}' has invalid handler: {}", endpoint, error))
    })?;
    let steps = compile_handler(&handler.body, &handler.ctx_name, &handler.args_name, endpoint)?;
    Ok(ManifestFunction { kind, args, steps })
}

fn parse_args(options: &str) -> Result<BTreeMap<String, FieldDefinition>, String> {
    let args_re = Regex::new(r"args\s*:\s*\{").map_err(|e| e.to_string())?;
    let Some(m) = args_re.find(options) else {
        return Ok(BTreeMap::new());
    };
    let (block, _) = extract_braced_block(options, m.end() - 1)?;
    let mut args = BTreeMap::<String, FieldDefinition>::new();
    let cleaned = strip_line_comments(&block);
    for entry in split_top_level(&cleaned, ',') {
        let trimmed = entry.trim();
        if trimmed.is_empty() {
            continue;
        }
        let Some(colon) = find_top_level_char(trimmed, ':') else {
            return Err(format!("invalid args entry '{}'", trimmed));
        };
        let key = parse_property_name(&trimmed[..colon])?;
        let value = parse_field_definition(trimmed[colon + 1..].trim())?;
        args.insert(key, value);
    }
    Ok(args)
}

fn parse_handler(options: &str) -> Result<ParsedHandler, String> {
    let handler_re = Regex::new(
        r"handler\s*:\s*async\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*=>\s*\{",
    )
    .map_err(|e| e.to_string())?;
    let caps = handler_re
        .captures(options)
        .ok_or_else(|| "missing handler declaration".to_string())?;
    let full = caps
        .get(0)
        .ok_or_else(|| "invalid handler declaration".to_string())?;
    let ctx_name = caps
        .get(1)
        .map(|m| m.as_str().to_string())
        .ok_or_else(|| "missing ctx parameter".to_string())?;
    let args_name = caps
        .get(2)
        .map(|m| m.as_str().to_string())
        .ok_or_else(|| "missing args parameter".to_string())?;
    let (body, _) = extract_braced_block(options, full.end() - 1)?;
    Ok(ParsedHandler {
        ctx_name,
        args_name,
        body,
    })
}

fn compile_handler(
    body: &str,
    ctx_name: &str,
    args_name: &str,
    endpoint: &str,
) -> Result<Vec<ManifestStep>, AppError> {
    let decl_re = Regex::new(r"^(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$")
        .map_err(|e| AppError::internal(e.to_string()))?;
    let read_re = Regex::new(&format!(
        r#"^await\s+{}\.db\.read\(\s*["']([^"']+)["']\s*\)\.collect\(\s*\)$"#,
        regex::escape(ctx_name)
    ))
    .map_err(|e| AppError::internal(e.to_string()))?;
    let insert_re = Regex::new(&format!(
        r#"^await\s+{}\.db\.insert\(\s*["']([^"']+)["']\s*,\s*(.+)\)$"#,
        regex::escape(ctx_name)
    ))
    .map_err(|e| AppError::internal(e.to_string()))?;
    let get_re = Regex::new(&format!(
        r#"^await\s+{}\.db\.get\(\s*["']([^"']+)["']\s*,\s*(.+)\)$"#,
        regex::escape(ctx_name)
    ))
    .map_err(|e| AppError::internal(e.to_string()))?;
    let get_no_await_re = Regex::new(&format!(
        r#"^{}\.db\.get\(\s*["']([^"']+)["']\s*,\s*(.+)\)$"#,
        regex::escape(ctx_name)
    ))
    .map_err(|e| AppError::internal(e.to_string()))?;

    let mut vars = BTreeSet::<String>::new();
    let mut steps = Vec::<ManifestStep>::new();
    let cleaned_body = strip_line_comments(body);
    for statement in split_top_level(&cleaned_body, ';') {
        let statement = statement.trim();
        if statement.is_empty() || statement.starts_with("console.log(") {
            continue;
        }

        if let Some(caps) = decl_re.captures(statement) {
            let name = caps
                .get(1)
                .map(|m| m.as_str().to_string())
                .ok_or_else(|| AppError::validation("invalid declaration".to_string()))?;
            let initializer = caps
                .get(2)
                .map(|m| m.as_str().trim().to_string())
                .ok_or_else(|| AppError::validation("invalid initializer".to_string()))?;

            if let Some(read_caps) = read_re.captures(&initializer) {
                let table = read_caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .ok_or_else(|| AppError::validation("invalid read expression".to_string()))?;
                let mut payload = BTreeMap::new();
                payload.insert("table".to_string(), Value::String(table));
                steps.push(ManifestStep {
                    op: "get".to_string(),
                    into: Some(name.clone()),
                    payload,
                });
                vars.insert(name);
                continue;
            }

            if let Some(insert_caps) = insert_re.captures(&initializer) {
                let table = insert_caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .ok_or_else(|| AppError::validation("invalid insert expression".to_string()))?;
                let value_expr = insert_caps
                    .get(2)
                    .map(|m| m.as_str().trim())
                    .ok_or_else(|| AppError::validation("invalid insert value".to_string()))?;
                let mut payload = BTreeMap::new();
                payload.insert("table".to_string(), Value::String(table));
                payload.insert(
                    "value".to_string(),
                    compile_expression(value_expr, args_name, &vars)?,
                );
                steps.push(ManifestStep {
                    op: "insert".to_string(),
                    into: Some(name.clone()),
                    payload,
                });
                vars.insert(name);
                continue;
            }

            if let Some(get_caps) = get_re.captures(&initializer) {
                let table = get_caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .ok_or_else(|| AppError::validation("invalid get expression".to_string()))?;
                let id_expr = get_caps
                    .get(2)
                    .map(|m| m.as_str().trim())
                    .ok_or_else(|| AppError::validation("invalid get id".to_string()))?;
                let id_value = compile_expression(id_expr, args_name, &vars)?;
                let mut payload = BTreeMap::new();
                payload.insert("table".to_string(), Value::String(table));
                payload.insert("where".to_string(), json!({ "_id": { "$eq": id_value } }));
                steps.push(ManifestStep {
                    op: "first".to_string(),
                    into: Some(name.clone()),
                    payload,
                });
                vars.insert(name);
                continue;
            }

            let mut payload = BTreeMap::new();
            payload.insert("name".to_string(), Value::String(name.clone()));
            payload.insert(
                "value".to_string(),
                compile_expression(&initializer, args_name, &vars)?,
            );
            steps.push(ManifestStep {
                op: "setVar".to_string(),
                into: None,
                payload,
            });
            vars.insert(name);
            continue;
        }

        if let Some(return_expr) = statement.strip_prefix("return") {
            let return_expr = return_expr.trim();
            if return_expr.is_empty() {
                let mut payload = BTreeMap::new();
                payload.insert("value".to_string(), Value::Null);
                steps.push(ManifestStep {
                    op: "return".to_string(),
                    into: None,
                    payload,
                });
                break;
            }

            let get_caps = get_re
                .captures(return_expr)
                .or_else(|| get_no_await_re.captures(return_expr));
            if let Some(get_caps) = get_caps {
                let table = get_caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .ok_or_else(|| AppError::validation("invalid return get".to_string()))?;
                let id_expr = get_caps
                    .get(2)
                    .map(|m| m.as_str().trim())
                    .ok_or_else(|| AppError::validation("invalid return id".to_string()))?;
                let id_value = compile_expression(id_expr, args_name, &vars)?;
                let mut first_payload = BTreeMap::new();
                first_payload.insert("table".to_string(), Value::String(table));
                first_payload.insert("where".to_string(), json!({ "_id": { "$eq": id_value } }));
                steps.push(ManifestStep {
                    op: "first".to_string(),
                    into: Some("__return_value".to_string()),
                    payload: first_payload,
                });
                let mut return_payload = BTreeMap::new();
                return_payload.insert(
                    "value".to_string(),
                    Value::String("$var.__return_value".to_string()),
                );
                steps.push(ManifestStep {
                    op: "return".to_string(),
                    into: None,
                    payload: return_payload,
                });
                break;
            }

            let mut payload = BTreeMap::new();
            payload.insert(
                "value".to_string(),
                compile_expression(return_expr, args_name, &vars)?,
            );
            steps.push(ManifestStep {
                op: "return".to_string(),
                into: None,
                payload,
            });
            break;
        }

        return Err(AppError::validation(format!(
            "function '{}' contains unsupported statement '{}'",
            endpoint, statement
        )));
    }

    if steps.is_empty() {
        return Err(AppError::validation(format!(
            "function '{}' handler produced no executable steps",
            endpoint
        )));
    }
    Ok(steps)
}

fn compile_expression(
    expression: &str,
    args_name: &str,
    vars: &BTreeSet<String>,
) -> Result<Value, AppError> {
    let expr = expression.trim();
    if let Some(inner) = expr.strip_prefix("await") {
        return compile_expression(inner.trim(), args_name, vars);
    }
    if expr == "true" {
        return Ok(Value::Bool(true));
    }
    if expr == "false" {
        return Ok(Value::Bool(false));
    }
    if expr == "null" || expr == "undefined" {
        return Ok(Value::Null);
    }
    if let Some(text) = parse_string_literal(expr) {
        return Ok(Value::String(text));
    }
    if let Ok(int_value) = expr.parse::<i64>() {
        return Ok(Value::Number(int_value.into()));
    }
    if let Ok(float_value) = expr.parse::<f64>() {
        let number = serde_json::Number::from_f64(float_value)
            .ok_or_else(|| AppError::validation(format!("invalid number '{}'", expr)))?;
        return Ok(Value::Number(number));
    }
    if expr.starts_with('{') && expr.ends_with('}') {
        let inner = &expr[1..expr.len() - 1];
        let mut object = Map::<String, Value>::new();
        for entry in split_top_level(inner, ',') {
            let trimmed = entry.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Some(colon) = find_top_level_char(trimmed, ':') {
                let key = parse_property_name(&trimmed[..colon])
                    .map_err(AppError::validation)?;
                let value = compile_expression(trimmed[colon + 1..].trim(), args_name, vars)?;
                object.insert(key, value);
            } else {
                let key = parse_property_name(trimmed).map_err(AppError::validation)?;
                let value = compile_expression(trimmed, args_name, vars)?;
                object.insert(key, value);
            }
        }
        return Ok(Value::Object(object));
    }
    if expr.starts_with('[') && expr.ends_with(']') {
        let inner = &expr[1..expr.len() - 1];
        let values = split_top_level(inner, ',')
            .into_iter()
            .filter(|part| !part.trim().is_empty())
            .map(|part| compile_expression(part.trim(), args_name, vars))
            .collect::<Result<Vec<Value>, AppError>>()?;
        return Ok(Value::Array(values));
    }
    if expr == args_name {
        return Ok(Value::String("$arg".to_string()));
    }
    if let Some(rest) = expr.strip_prefix(&format!("{}.", args_name)) {
        return Ok(Value::String(format!("$arg.{}", rest)));
    }
    if vars.contains(expr) {
        return Ok(Value::String(format!("$var.{}", expr)));
    }
    if let Some(dot) = expr.find('.') {
        let root = &expr[..dot];
        if vars.contains(root) {
            return Ok(Value::String(format!("$var.{}", expr)));
        }
    }
    Err(AppError::validation(format!(
        "unsupported function expression '{}'",
        expression
    )))
}

fn parse_field_definition(expression: &str) -> Result<FieldDefinition, String> {
    let expr = expression.trim();
    if expr == "value.string()" {
        return Ok(field(FieldType::String));
    }
    if expr == "value.number()" {
        return Ok(field(FieldType::Number));
    }
    if expr == "value.boolean()" {
        return Ok(field(FieldType::Boolean));
    }
    if let Some(argument) = parse_call_argument(expr, "value.id") {
        let table = parse_string_literal(argument)
            .ok_or_else(|| "value.id(table) expects a string literal".to_string())?;
        let mut definition = field(FieldType::Id);
        definition.table = Some(table);
        return Ok(definition);
    }
    Err(format!("unsupported validator '{}'", expression))
}

fn field(field_type: FieldType) -> FieldDefinition {
    FieldDefinition {
        field_type,
        table: None,
        shape: BTreeMap::new(),
        inner: None,
    }
}

fn parse_call_argument<'a>(expression: &'a str, callee: &str) -> Option<&'a str> {
    let expr = expression.trim();
    if !expr.starts_with(callee) {
        return None;
    }
    let rest = expr[callee.len()..].trim_start();
    if !rest.starts_with('(') || !expr.ends_with(')') {
        return None;
    }
    let open = expr.find('(')?;
    let close = expr.rfind(')')?;
    Some(expr[open + 1..close].trim())
}

fn parse_property_name(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if let Some(text) = parse_string_literal(trimmed) {
        return Ok(text);
    }
    let identifier_re = Regex::new(r"^[A-Za-z_][A-Za-z0-9_]*$")
        .map_err(|e| e.to_string())?;
    if identifier_re.is_match(trimmed) {
        return Ok(trimmed.to_string());
    }
    Err(format!("invalid property name '{}'", value))
}

fn parse_string_literal(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.len() < 2 {
        return None;
    }
    let quote = trimmed.chars().next()?;
    if (quote != '"' && quote != '\'' && quote != '`') || !trimmed.ends_with(quote) {
        return None;
    }
    Some(trimmed[1..trimmed.len() - 1].to_string())
}

fn strip_line_comments(input: &str) -> String {
    input
        .lines()
        .map(|line| {
            if let Some(index) = line.find("//") {
                line[..index].to_string()
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn split_top_level(input: &str, delimiter: char) -> Vec<String> {
    let mut out = Vec::<String>::new();
    let mut start = 0usize;
    let mut paren = 0i32;
    let mut brace = 0i32;
    let mut bracket = 0i32;
    let mut in_single = false;
    let mut in_double = false;
    let mut in_backtick = false;
    let mut escape = false;

    for (index, ch) in input.char_indices() {
        if in_single || in_double || in_backtick {
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' {
                escape = true;
                continue;
            }
            if in_single && ch == '\'' {
                in_single = false;
            } else if in_double && ch == '"' {
                in_double = false;
            } else if in_backtick && ch == '`' {
                in_backtick = false;
            }
            continue;
        }

        match ch {
            '\'' => in_single = true,
            '"' => in_double = true,
            '`' => in_backtick = true,
            '(' => paren += 1,
            ')' => paren -= 1,
            '{' => brace += 1,
            '}' => brace -= 1,
            '[' => bracket += 1,
            ']' => bracket -= 1,
            _ => {}
        }

        if ch == delimiter && paren == 0 && brace == 0 && bracket == 0 {
            out.push(input[start..index].to_string());
            start = index + ch.len_utf8();
        }
    }
    out.push(input[start..].to_string());
    out
}

fn find_top_level_char(input: &str, needle: char) -> Option<usize> {
    let mut paren = 0i32;
    let mut brace = 0i32;
    let mut bracket = 0i32;
    let mut in_single = false;
    let mut in_double = false;
    let mut in_backtick = false;
    let mut escape = false;

    for (index, ch) in input.char_indices() {
        if in_single || in_double || in_backtick {
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' {
                escape = true;
                continue;
            }
            if in_single && ch == '\'' {
                in_single = false;
            } else if in_double && ch == '"' {
                in_double = false;
            } else if in_backtick && ch == '`' {
                in_backtick = false;
            }
            continue;
        }

        match ch {
            '\'' => in_single = true,
            '"' => in_double = true,
            '`' => in_backtick = true,
            '(' => paren += 1,
            ')' => paren -= 1,
            '{' => brace += 1,
            '}' => brace -= 1,
            '[' => bracket += 1,
            ']' => bracket -= 1,
            _ => {}
        }
        if ch == needle && paren == 0 && brace == 0 && bracket == 0 {
            return Some(index);
        }
    }
    None
}

fn extract_braced_block(input: &str, open_brace: usize) -> Result<(String, usize), String> {
    if input
        .as_bytes()
        .get(open_brace)
        .copied()
        .map(char::from)
        != Some('{')
    {
        return Err("expected '{'".to_string());
    }

    let mut depth = 0i32;
    let mut in_single = false;
    let mut in_double = false;
    let mut in_backtick = false;
    let mut escape = false;

    for (offset, ch) in input[open_brace..].char_indices() {
        let index = open_brace + offset;
        if in_single || in_double || in_backtick {
            if escape {
                escape = false;
                continue;
            }
            if ch == '\\' {
                escape = true;
                continue;
            }
            if in_single && ch == '\'' {
                in_single = false;
            } else if in_double && ch == '"' {
                in_double = false;
            } else if in_backtick && ch == '`' {
                in_backtick = false;
            }
            continue;
        }

        match ch {
            '\'' => in_single = true,
            '"' => in_double = true,
            '`' => in_backtick = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Ok((input[open_brace + 1..index].to_string(), index));
                }
            }
            _ => {}
        }
    }

    Err("unterminated block".to_string())
}

#[cfg(test)]
mod tests {
    use super::load_functions_from_source;
    use std::fs;
    use std::path::PathBuf;
    use uuid::Uuid;

    fn temp_root() -> PathBuf {
        std::env::temp_dir().join(format!("skypydb-runtime-fns-{}", Uuid::new_v4()))
    }

    #[test]
    fn loader_reads_read_and_write_functions() {
        let root = temp_root();
        let source_dir = root.join("skypydb");
        fs::create_dir_all(&source_dir).expect("create source dir");

        fs::write(
            source_dir.join("users.ts"),
            r#"
import { writeFunction, value } from "skypydb/functions";
export const createUser = writeFunction({
  args: {
    name: value.string(),
    email: value.string(),
  },
  handler: async (ctx, args) => {
    const user = { author: args.name, body: args.email };
    const id = await ctx.db.insert("users", user);
    return await ctx.db.get("users", id);
  },
});
"#,
        )
        .expect("write users.ts");

        fs::write(
            source_dir.join("read.ts"),
            r#"
import { readFunction, value } from "skypydb/functions";
export const readDatabase = readFunction({
  args: {
    name: value.string(),
    email: value.string(),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db.read("users").collect();
    console.log(args.name, args.email);
    return docs;
  },
});
"#,
        )
        .expect("write read.ts");

        let manifest = load_functions_from_source(&source_dir).expect("load source functions");
        assert_eq!(manifest.version, 1);
        assert_eq!(manifest.functions.len(), 2);
        assert!(manifest.functions.contains_key("users.createUser"));
        assert!(manifest.functions.contains_key("read.readDatabase"));

        let _ = fs::remove_dir_all(root);
    }
}
