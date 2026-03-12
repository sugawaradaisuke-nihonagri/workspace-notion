import { describe, it, expect } from "vitest";
import { hasRole, can } from "../permissions";

// =============================================
// hasRole
// =============================================

describe("hasRole", () => {
  it("owner meets all roles", () => {
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("owner", "editor")).toBe(true);
    expect(hasRole("owner", "commenter")).toBe(true);
    expect(hasRole("owner", "viewer")).toBe(true);
  });

  it("viewer only meets viewer role", () => {
    expect(hasRole("viewer", "viewer")).toBe(true);
    expect(hasRole("viewer", "commenter")).toBe(false);
    expect(hasRole("viewer", "editor")).toBe(false);
    expect(hasRole("viewer", "admin")).toBe(false);
    expect(hasRole("viewer", "owner")).toBe(false);
  });

  it("editor meets editor, commenter, viewer", () => {
    expect(hasRole("editor", "editor")).toBe(true);
    expect(hasRole("editor", "commenter")).toBe(true);
    expect(hasRole("editor", "viewer")).toBe(true);
    expect(hasRole("editor", "admin")).toBe(false);
  });

  it("admin meets admin and below", () => {
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("admin", "editor")).toBe(true);
    expect(hasRole("admin", "owner")).toBe(false);
  });

  it("commenter meets commenter and viewer", () => {
    expect(hasRole("commenter", "commenter")).toBe(true);
    expect(hasRole("commenter", "viewer")).toBe(true);
    expect(hasRole("commenter", "editor")).toBe(false);
  });

  it("returns false for unknown roles", () => {
    expect(hasRole("unknown", "viewer")).toBe(false);
    expect(hasRole("editor", "unknown" as never)).toBe(false);
    expect(hasRole("", "viewer")).toBe(false);
  });
});

// =============================================
// can.*
// =============================================

describe("can", () => {
  describe("can.view", () => {
    it("allows viewer and above", () => {
      expect(can.view("viewer")).toBe(true);
      expect(can.view("commenter")).toBe(true);
      expect(can.view("editor")).toBe(true);
      expect(can.view("admin")).toBe(true);
      expect(can.view("owner")).toBe(true);
    });
  });

  describe("can.comment", () => {
    it("allows commenter and above, denies viewer", () => {
      expect(can.comment("viewer")).toBe(false);
      expect(can.comment("commenter")).toBe(true);
      expect(can.comment("editor")).toBe(true);
    });
  });

  describe("can.edit", () => {
    it("allows editor and above, denies commenter and viewer", () => {
      expect(can.edit("viewer")).toBe(false);
      expect(can.edit("commenter")).toBe(false);
      expect(can.edit("editor")).toBe(true);
      expect(can.edit("admin")).toBe(true);
    });
  });

  describe("can.admin", () => {
    it("allows admin and owner only", () => {
      expect(can.admin("editor")).toBe(false);
      expect(can.admin("admin")).toBe(true);
      expect(can.admin("owner")).toBe(true);
    });
  });

  describe("can.owner", () => {
    it("allows owner only", () => {
      expect(can.owner("admin")).toBe(false);
      expect(can.owner("owner")).toBe(true);
    });
  });
});
