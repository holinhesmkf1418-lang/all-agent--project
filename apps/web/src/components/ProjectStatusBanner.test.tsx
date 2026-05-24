import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectStatusBanner } from "./ProjectStatusBanner";

describe("ProjectStatusBanner", () => {
  it("renders a blocked project warning", () => {
    const html = renderToStaticMarkup(<ProjectStatusBanner status="blocked" />);

    expect(html).toContain("当前项目执行失败");
  });

  it("renders nothing for active project statuses", () => {
    const html = renderToStaticMarkup(<ProjectStatusBanner status="waiting_test" />);

    expect(html).toBe("");
  });
});
