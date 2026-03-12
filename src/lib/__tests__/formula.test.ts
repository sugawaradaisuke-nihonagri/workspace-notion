import { describe, it, expect } from "vitest";
import { evaluateFormula, tokenize, toNumber } from "../formula";

// =============================================
// Tokenizer
// =============================================

describe("tokenize", () => {
  it("tokenizes numbers", () => {
    const tokens = tokenize("42 3.14");
    expect(tokens).toEqual([
      { type: "number", value: 42 },
      { type: "number", value: 3.14 },
    ]);
  });

  it("tokenizes string literals (double and single quotes)", () => {
    const tokens = tokenize(`"hello" 'world'`);
    expect(tokens).toEqual([
      { type: "string", value: "hello" },
      { type: "string", value: "world" },
    ]);
  });

  it("tokenizes identifiers", () => {
    const tokens = tokenize("prop concat");
    expect(tokens).toEqual([
      { type: "ident", value: "prop" },
      { type: "ident", value: "concat" },
    ]);
  });

  it("converts true/false to numbers", () => {
    const tokens = tokenize("true false");
    expect(tokens).toEqual([
      { type: "number", value: 1 },
      { type: "number", value: 0 },
    ]);
  });

  it("tokenizes arithmetic operators", () => {
    const tokens = tokenize("+ - * / %");
    expect(tokens.map((t) => t.value)).toEqual(["+", "-", "*", "/", "%"]);
  });

  it("tokenizes comparison operators", () => {
    const tokens = tokenize("== != > < >= <=");
    expect(tokens.map((t) => t.value)).toEqual([
      "==",
      "!=",
      ">",
      "<",
      ">=",
      "<=",
    ]);
  });

  it("tokenizes parens and commas", () => {
    const tokens = tokenize("prop(a, b)");
    expect(tokens).toEqual([
      { type: "ident", value: "prop" },
      { type: "paren", value: "(" },
      { type: "ident", value: "a" },
      { type: "comma", value: "," },
      { type: "ident", value: "b" },
      { type: "paren", value: ")" },
    ]);
  });

  it("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

// =============================================
// toNumber
// =============================================

describe("toNumber", () => {
  it("passes through numbers", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(-3.14)).toBe(-3.14);
  });

  it("converts booleans", () => {
    expect(toNumber(true)).toBe(1);
    expect(toNumber(false)).toBe(0);
  });

  it("parses numeric strings", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber("3.14")).toBe(3.14);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(toNumber("hello")).toBe(0);
    expect(toNumber("")).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(toNumber(null)).toBe(0);
  });
});

// =============================================
// Arithmetic
// =============================================

describe("evaluateFormula — arithmetic", () => {
  it("evaluates addition", () => {
    expect(evaluateFormula("2 + 3")).toBe(5);
  });

  it("evaluates subtraction", () => {
    expect(evaluateFormula("10 - 4")).toBe(6);
  });

  it("evaluates multiplication", () => {
    expect(evaluateFormula("3 * 7")).toBe(21);
  });

  it("evaluates division", () => {
    expect(evaluateFormula("20 / 4")).toBe(5);
  });

  it("evaluates modulo", () => {
    expect(evaluateFormula("10 % 3")).toBe(1);
  });

  it("handles division by zero", () => {
    expect(evaluateFormula("5 / 0")).toBe(0);
  });

  it("respects operator precedence (* before +)", () => {
    expect(evaluateFormula("2 + 3 * 4")).toBe(14);
  });

  it("respects parentheses", () => {
    expect(evaluateFormula("(2 + 3) * 4")).toBe(20);
  });

  it("handles unary minus", () => {
    expect(evaluateFormula("-5")).toBe(-5);
    expect(evaluateFormula("-5 + 3")).toBe(-2);
  });

  it("handles decimals", () => {
    expect(evaluateFormula("1.5 + 2.5")).toBe(4);
  });

  it("handles chained operations", () => {
    expect(evaluateFormula("1 + 2 + 3 + 4")).toBe(10);
  });
});

// =============================================
// Comparison
// =============================================

describe("evaluateFormula — comparison", () => {
  it("evaluates == (equal)", () => {
    expect(evaluateFormula("5 == 5")).toBe(1);
    expect(evaluateFormula("5 == 3")).toBe(0);
  });

  it("evaluates != (not equal)", () => {
    expect(evaluateFormula("5 != 3")).toBe(1);
    expect(evaluateFormula("5 != 5")).toBe(0);
  });

  it("evaluates > and <", () => {
    expect(evaluateFormula("5 > 3")).toBe(1);
    expect(evaluateFormula("3 > 5")).toBe(0);
    expect(evaluateFormula("3 < 5")).toBe(1);
  });

  it("evaluates >= and <=", () => {
    expect(evaluateFormula("5 >= 5")).toBe(1);
    expect(evaluateFormula("5 <= 5")).toBe(1);
    expect(evaluateFormula("3 >= 5")).toBe(0);
  });
});

// =============================================
// String operations
// =============================================

describe("evaluateFormula — strings", () => {
  it("returns string literals", () => {
    expect(evaluateFormula('"hello"')).toBe("hello");
  });

  it("auto-concatenates with + when either side is string", () => {
    expect(evaluateFormula('"hello" + " world"')).toBe("hello world");
    expect(evaluateFormula('"count: " + 5')).toBe("count: 5");
  });
});

// =============================================
// Built-in functions
// =============================================

describe("evaluateFormula — functions", () => {
  it("concat() joins arguments", () => {
    expect(evaluateFormula('concat("a", "b", "c")')).toBe("abc");
  });

  it("if() returns then-branch when truthy", () => {
    expect(evaluateFormula('if(1, "yes", "no")')).toBe("yes");
  });

  it("if() returns else-branch when falsy", () => {
    expect(evaluateFormula('if(0, "yes", "no")')).toBe("no");
  });

  it("if() works with comparison expressions", () => {
    expect(evaluateFormula('if(5 > 3, "big", "small")')).toBe("big");
    expect(evaluateFormula('if(1 > 3, "big", "small")')).toBe("small");
  });

  it("length() returns string length", () => {
    expect(evaluateFormula('length("hello")')).toBe(5);
    expect(evaluateFormula('length("")')).toBe(0);
  });

  it("length() returns 0 for non-strings", () => {
    expect(evaluateFormula("length(42)")).toBe(0);
  });

  it("round() rounds to integer", () => {
    expect(evaluateFormula("round(3.7)")).toBe(4);
    expect(evaluateFormula("round(3.2)")).toBe(3);
  });

  it("floor() floors down", () => {
    expect(evaluateFormula("floor(3.9)")).toBe(3);
  });

  it("ceil() rounds up", () => {
    expect(evaluateFormula("ceil(3.1)")).toBe(4);
  });

  it("abs() returns absolute value", () => {
    expect(evaluateFormula("abs(-5)")).toBe(5);
    expect(evaluateFormula("abs(5)")).toBe(5);
  });

  it("now() returns ISO datetime string", () => {
    const result = evaluateFormula("now()");
    expect(typeof result).toBe("string");
    expect(() => new Date(result as string)).not.toThrow();
  });

  it("empty() returns 1 for null/empty, 0 otherwise", () => {
    expect(evaluateFormula('empty("")')).toBe(1);
    expect(evaluateFormula('empty("hello")')).toBe(0);
  });

  it("toNumber() converts strings", () => {
    expect(evaluateFormula('toNumber("42")')).toBe(42);
    expect(evaluateFormula('toNumber("abc")')).toBe(0);
  });

  it("unknown functions return null", () => {
    expect(evaluateFormula("unknownFn()")).toBe(null);
  });
});

// =============================================
// prop() with context
// =============================================

describe("evaluateFormula — prop()", () => {
  const rowValues = new Map<string, unknown>([
    ["prop-1", 100],
    ["prop-2", 50],
    ["prop-3", "hello"],
  ]);
  const propertyNameMap = new Map([
    ["Price", "prop-1"],
    ["Tax", "prop-2"],
    ["Label", "prop-3"],
  ]);
  const context = { rowValues, propertyNameMap };

  it("reads numeric property value", () => {
    expect(evaluateFormula('prop("Price")', context)).toBe(100);
  });

  it("reads string property value", () => {
    expect(evaluateFormula('prop("Label")', context)).toBe("hello");
  });

  it("uses prop values in arithmetic", () => {
    expect(evaluateFormula('prop("Price") + prop("Tax")', context)).toBe(150);
  });

  it("returns null for unknown property", () => {
    expect(evaluateFormula('prop("Unknown")', context)).toBe(null);
  });

  it("returns null without context", () => {
    expect(evaluateFormula('prop("Price")')).toBe(null);
  });
});

// =============================================
// Edge cases
// =============================================

describe("evaluateFormula — edge cases", () => {
  it("handles empty expression", () => {
    expect(evaluateFormula("")).toBe(null);
  });

  it("handles whitespace-only expression", () => {
    expect(evaluateFormula("   ")).toBe(null);
  });

  it("handles nested function calls", () => {
    expect(evaluateFormula("round(3.14 * 2)")).toBe(6);
  });

  it("handles deeply nested parentheses", () => {
    expect(evaluateFormula("((((5))))")).toBe(5);
  });

  it("handles complex expression", () => {
    expect(evaluateFormula('if(10 > 5, round(3.7) * 2, length("hello"))')).toBe(
      8,
    );
  });

  it("boolean true/false are numbers 1/0", () => {
    expect(evaluateFormula("true + 1")).toBe(2);
    expect(evaluateFormula("false + 1")).toBe(1);
  });
});
