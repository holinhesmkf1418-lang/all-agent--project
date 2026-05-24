import { describe, expect, it } from "vitest";
import type { ProjectStatus } from "@agent-army/shared";
import { nextStatusAfterApproval, nextStatusAfterStageSuccess, rejectionTarget } from "./workflow";

describe("workflow", () => {
  it.each([
    ["planning", "waiting_plan"],
    ["prd", "waiting_prd"],
    ["ui_optional", "developing"],
    ["developing", "testing"],
    ["testing", "waiting_test"],
    ["reviewing", "delivered"]
  ] satisfies Array<[ProjectStatus, ProjectStatus]>)(
    "moves %s stage success to %s",
    (current, expected) => {
      expect(nextStatusAfterStageSuccess(current, false)).toBe(expected);
    }
  );

  it.each([
    ["waiting_plan", false, "prd"],
    ["waiting_prd", false, "developing"],
    ["waiting_prd", true, "ui_optional"],
    ["waiting_test", false, "reviewing"]
  ] satisfies Array<[ProjectStatus, boolean, ProjectStatus]>)(
    "moves approved %s to %s",
    (current, uiStageEnabled, expected) => {
      expect(nextStatusAfterApproval(current, uiStageEnabled)).toBe(expected);
    }
  );

  it.each([
    ["waiting_plan", "planning"],
    ["waiting_prd", "prd"],
    ["waiting_test", "developing"]
  ] satisfies Array<[ProjectStatus, ProjectStatus]>)(
    "routes rejected %s back to %s",
    (current, expected) => {
      expect(rejectionTarget(current)).toBe(expected);
    }
  );

  it.each([
    "created",
    "waiting_plan",
    "waiting_prd",
    "waiting_test",
    "delivered",
    "blocked"
  ] satisfies ProjectStatus[])("rejects stage success from invalid status %s", (status) => {
    expect(() => nextStatusAfterStageSuccess(status, false)).toThrow(`Cannot complete stage from status: ${status}`);
  });

  it.each([
    "created",
    "planning",
    "prd",
    "ui_optional",
    "developing",
    "testing",
    "reviewing",
    "delivered",
    "blocked"
  ] satisfies ProjectStatus[])("rejects approval from invalid status %s", (status) => {
    expect(() => nextStatusAfterApproval(status, false)).toThrow(`Cannot approve from status: ${status}`);
  });

  it.each([
    "created",
    "planning",
    "prd",
    "ui_optional",
    "developing",
    "testing",
    "reviewing",
    "delivered",
    "blocked"
  ] satisfies ProjectStatus[])("rejects rejection from invalid status %s", (status) => {
    expect(() => rejectionTarget(status)).toThrow(`Cannot reject from status: ${status}`);
  });
});
