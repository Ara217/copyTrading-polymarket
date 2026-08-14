import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  // Effects don't run during SSR, so this exercises the initial (empty) render:
  // it must mount without a crash and show the empty-state guidance.
  it("renders the empty state and controls", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(markup).toContain("No analyzed traders yet");
    expect(markup).toContain("Traders");
    expect(markup).toContain("Final score");
  });
});
