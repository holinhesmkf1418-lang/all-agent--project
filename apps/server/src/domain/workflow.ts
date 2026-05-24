import type { ProjectStatus } from "@agent-army/shared";

export function nextStatusAfterStageSuccess(status: ProjectStatus, uiStageEnabled: boolean): ProjectStatus {
  switch (status) {
    case "planning":
      return "waiting_plan";
    case "prd":
      return "waiting_prd";
    case "ui_optional":
      return "developing";
    case "developing":
      return "testing";
    case "testing":
      return "waiting_test";
    case "reviewing":
      return "delivered";
    default:
      throw new Error(`Cannot complete stage from status: ${status}`);
  }
}

export function nextStatusAfterApproval(status: ProjectStatus, uiStageEnabled: boolean): ProjectStatus {
  switch (status) {
    case "waiting_plan":
      return "prd";
    case "waiting_prd":
      return uiStageEnabled ? "ui_optional" : "developing";
    case "waiting_test":
      return "reviewing";
    default:
      throw new Error(`Cannot approve from status: ${status}`);
  }
}

export function rejectionTarget(status: ProjectStatus): ProjectStatus {
  switch (status) {
    case "waiting_plan":
      return "planning";
    case "waiting_prd":
      return "prd";
    case "waiting_test":
      return "developing";
    default:
      throw new Error(`Cannot reject from status: ${status}`);
  }
}
