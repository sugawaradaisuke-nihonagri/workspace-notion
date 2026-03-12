"use client";

import { useMemo } from "react";
import { FunctionSquare } from "lucide-react";
import type { CellValue, FormulaConfig } from "@/types/database";

interface FormulaCellProps {
  value: CellValue;
  config: Record<string, unknown>;
  /** All cell values for the current row — Map<propertyId, CellValue> */
  rowValues?: Map<string, CellValue>;
  /** Property name → id mapping for prop("Name") lookups */
  propertyNameMap?: Map<string, string>;
}

/**
 * Formula cell — evaluates a simple expression using values from the same row.
 *
 * Supported syntax:
 * - prop("Property Name")  — reference another property's value
 * - +, -, *, /             — arithmetic
 * - Numeric literals       — 42, 3.14
 * - String literals        — "hello"
 * - concat(a, b)           — string concatenation
 * - if(cond, then, else)   — conditional
 * - length(val)            — string/array length
 * - round(num)             — round to integer
 * - now()                  — current ISO datetime string
 * - empty(val)             — true if null/empty
 * - toNumber(val)          — parse as number
 */
export function FormulaCell({
  config,
  rowValues,
  propertyNameMap,
}: FormulaCellProps) {
  const formulaConfig = config as unknown as FormulaConfig;
  const expression = formulaConfig?.expression ?? "";

  const result = useMemo(() => {
    if (!expression) return null;
    try {
      return evaluateFormula(expression, rowValues, propertyNameMap);
    } catch {
      return "#ERROR";
    }
  }, [expression, rowValues, propertyNameMap]);

  if (!expression) {
    return (
      <div className="px-2 py-1 text-[12px] text-[var(--text-tertiary)]">
        数式を設定してください
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-[13px] text-[var(--text-secondary)]">
      <FunctionSquare size={12} className="shrink-0 opacity-50" />
      <span>{result != null ? String(result) : "—"}</span>
    </div>
  );
}

// --- Formula evaluator ---

type FormulaValue = string | number | boolean | null;

function evaluateFormula(
  expr: string,
  rowValues?: Map<string, CellValue>,
  propertyNameMap?: Map<string, string>,
): FormulaValue {
  const tokens = tokenize(expr.trim());
  const ctx: EvalContext = { rowValues, propertyNameMap, pos: 0, tokens };
  const result = parseExpression(ctx);
  return result;
}

interface EvalContext {
  rowValues?: Map<string, CellValue>;
  propertyNameMap?: Map<string, string>;
  pos: number;
  tokens: Token[];
}

type Token =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: string }
  | { type: "comma"; value: "," };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = "";
      i++;
      while (i < expr.length && expr[i] !== quote) {
        str += expr[i];
        i++;
      }
      i++; // closing quote
      tokens.push({ type: "string", value: str });
      continue;
    }

    // Number
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    // Identifier (function name or keyword)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      // Boolean literals
      if (ident === "true") {
        tokens.push({ type: "number", value: 1 });
      } else if (ident === "false") {
        tokens.push({ type: "number", value: 0 });
      } else {
        tokens.push({ type: "ident", value: ident });
      }
      continue;
    }

    // Operators
    if ("+-*/%".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    // Comparison operators
    if (ch === "=" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: "==" });
      i += 2;
      continue;
    }
    if (ch === "!" && expr[i + 1] === "=") {
      tokens.push({ type: "op", value: "!=" });
      i += 2;
      continue;
    }
    if (ch === ">" || ch === "<") {
      if (expr[i + 1] === "=") {
        tokens.push({ type: "op", value: ch + "=" });
        i += 2;
      } else {
        tokens.push({ type: "op", value: ch });
        i++;
      }
      continue;
    }

    // Parentheses
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }

    // Comma
    if (ch === ",") {
      tokens.push({ type: "comma", value: "," });
      i++;
      continue;
    }

    i++;
  }

  return tokens;
}

function peek(ctx: EvalContext): Token | undefined {
  return ctx.tokens[ctx.pos];
}

function consume(ctx: EvalContext): Token {
  return ctx.tokens[ctx.pos++];
}

function parseExpression(ctx: EvalContext): FormulaValue {
  return parseComparison(ctx);
}

function parseComparison(ctx: EvalContext): FormulaValue {
  let left = parseAddSub(ctx);

  while (
    peek(ctx)?.type === "op" &&
    ["==", "!=", ">", "<", ">=", "<="].includes(peek(ctx)!.value as string)
  ) {
    const op = consume(ctx).value as string;
    const right = parseAddSub(ctx);
    const l = toNumber(left);
    const r = toNumber(right);
    switch (op) {
      case "==":
        left = left === right ? 1 : 0;
        break;
      case "!=":
        left = left !== right ? 1 : 0;
        break;
      case ">":
        left = l > r ? 1 : 0;
        break;
      case "<":
        left = l < r ? 1 : 0;
        break;
      case ">=":
        left = l >= r ? 1 : 0;
        break;
      case "<=":
        left = l <= r ? 1 : 0;
        break;
    }
  }

  return left;
}

function parseAddSub(ctx: EvalContext): FormulaValue {
  let left = parseMulDiv(ctx);

  while (
    peek(ctx)?.type === "op" &&
    ["+", "-"].includes(peek(ctx)!.value as string)
  ) {
    const op = consume(ctx).value;
    const right = parseMulDiv(ctx);
    if (op === "+") {
      // String concatenation if either side is a string
      if (typeof left === "string" || typeof right === "string") {
        left = String(left ?? "") + String(right ?? "");
      } else {
        left = toNumber(left) + toNumber(right);
      }
    } else {
      left = toNumber(left) - toNumber(right);
    }
  }

  return left;
}

function parseMulDiv(ctx: EvalContext): FormulaValue {
  let left = parseUnary(ctx);

  while (
    peek(ctx)?.type === "op" &&
    ["*", "/", "%"].includes(peek(ctx)!.value as string)
  ) {
    const op = consume(ctx).value;
    const right = parseUnary(ctx);
    if (op === "*") left = toNumber(left) * toNumber(right);
    else if (op === "/") {
      const d = toNumber(right);
      left = d === 0 ? 0 : toNumber(left) / d;
    } else left = toNumber(left) % toNumber(right);
  }

  return left;
}

function parseUnary(ctx: EvalContext): FormulaValue {
  if (peek(ctx)?.type === "op" && peek(ctx)!.value === "-") {
    consume(ctx);
    return -toNumber(parseAtom(ctx));
  }
  return parseAtom(ctx);
}

function parseAtom(ctx: EvalContext): FormulaValue {
  const token = peek(ctx);
  if (!token) return null;

  // Number
  if (token.type === "number") {
    consume(ctx);
    return token.value;
  }

  // String
  if (token.type === "string") {
    consume(ctx);
    return token.value;
  }

  // Parenthesized expression
  if (token.type === "paren" && token.value === "(") {
    consume(ctx);
    const val = parseExpression(ctx);
    if (peek(ctx)?.type === "paren" && peek(ctx)!.value === ")") {
      consume(ctx);
    }
    return val;
  }

  // Function call or identifier
  if (token.type === "ident") {
    consume(ctx);
    const name = token.value;

    // Check for function call
    if (peek(ctx)?.type === "paren" && peek(ctx)!.value === "(") {
      consume(ctx); // (
      const args: FormulaValue[] = [];

      while (
        peek(ctx) &&
        !(peek(ctx)!.type === "paren" && peek(ctx)!.value === ")")
      ) {
        if (args.length > 0 && peek(ctx)?.type === "comma") {
          consume(ctx);
        }
        args.push(parseExpression(ctx));
      }

      if (peek(ctx)?.type === "paren" && peek(ctx)!.value === ")") {
        consume(ctx);
      }

      return callFunction(name, args, ctx);
    }

    return null;
  }

  consume(ctx);
  return null;
}

function callFunction(
  name: string,
  args: FormulaValue[],
  ctx: EvalContext,
): FormulaValue {
  switch (name) {
    case "prop": {
      const propName = String(args[0] ?? "");
      if (!ctx.propertyNameMap || !ctx.rowValues) return null;
      const propId = ctx.propertyNameMap.get(propName);
      if (!propId) return null;
      const val = ctx.rowValues.get(propId);
      if (val == null) return null;
      if (typeof val === "string" || typeof val === "number") return val;
      if (typeof val === "boolean") return val ? 1 : 0;
      return String(val);
    }
    case "concat":
      return args.map((a) => String(a ?? "")).join("");
    case "if":
      return toNumber(args[0]) !== 0 ? (args[1] ?? null) : (args[2] ?? null);
    case "length": {
      const v = args[0];
      if (typeof v === "string") return v.length;
      return 0;
    }
    case "round":
      return Math.round(toNumber(args[0]));
    case "floor":
      return Math.floor(toNumber(args[0]));
    case "ceil":
      return Math.ceil(toNumber(args[0]));
    case "abs":
      return Math.abs(toNumber(args[0]));
    case "now":
      return new Date().toISOString();
    case "empty":
      return args[0] == null || args[0] === "" ? 1 : 0;
    case "toNumber":
      return toNumber(args[0]);
    default:
      return null;
  }
}

function toNumber(val: FormulaValue): number {
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
