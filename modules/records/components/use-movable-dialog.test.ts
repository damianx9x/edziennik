import { describe, expect, it } from "vitest";

import { constrainDialogPosition } from "./use-movable-dialog";

describe("constrainDialogPosition", () => {
  it("keeps every edge of the dialog inside the viewport", () => {
    expect(
      constrainDialogPosition({
        startLeft: 100,
        startTop: 80,
        deltaX: 1000,
        deltaY: 1000,
        dialogWidth: 420,
        dialogHeight: 300,
        viewportWidth: 1000,
        viewportHeight: 700,
      }),
    ).toEqual({ left: 572, top: 392 });
  });

  it("keeps the dialog padding when dragged beyond the top-left corner", () => {
    expect(
      constrainDialogPosition({
        startLeft: 100,
        startTop: 80,
        deltaX: -1000,
        deltaY: -1000,
        dialogWidth: 420,
        dialogHeight: 300,
        viewportWidth: 1000,
        viewportHeight: 700,
      }),
    ).toEqual({ left: 8, top: 8 });
  });

  it("anchors an oversized dialog at the safe viewport edge", () => {
    expect(
      constrainDialogPosition({
        startLeft: 20,
        startTop: 20,
        deltaX: 300,
        deltaY: 300,
        dialogWidth: 1200,
        dialogHeight: 800,
        viewportWidth: 1000,
        viewportHeight: 700,
      }),
    ).toEqual({ left: 8, top: 8 });
  });
});
