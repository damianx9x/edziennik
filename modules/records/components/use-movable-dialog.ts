"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type DialogPositionInput = {
  startLeft: number;
  startTop: number;
  deltaX: number;
  deltaY: number;
  dialogWidth: number;
  dialogHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
};

export function constrainDialogPosition({
  startLeft,
  startTop,
  deltaX,
  deltaY,
  dialogWidth,
  dialogHeight,
  viewportWidth,
  viewportHeight,
  padding = 8,
}: DialogPositionInput) {
  const maxLeft = Math.max(padding, viewportWidth - dialogWidth - padding);
  const maxTop = Math.max(padding, viewportHeight - dialogHeight - padding);

  return {
    left: Math.min(Math.max(padding, startLeft + deltaX), maxLeft),
    top: Math.min(Math.max(padding, startTop + deltaY), maxTop),
  };
}

export function useMovableDialog(dialogRef: RefObject<HTMLDialogElement | null>) {
  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!window.matchMedia("(min-width: 761px)").matches) return;
    if ((event.target as HTMLElement).closest("button, a, input, select")) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left;
    const startTop = rect.top;
    const dragHandle = event.currentTarget;
    const pointerId = event.pointerId;
    dragHandle.setPointerCapture(pointerId);
    dialog.style.margin = "0";
    dialog.style.left = `${startLeft}px`;
    dialog.style.top = `${startTop}px`;

    function move(pointerEvent: PointerEvent) {
      const position = constrainDialogPosition({
        startLeft,
        startTop,
        deltaX: pointerEvent.clientX - startX,
        deltaY: pointerEvent.clientY - startY,
        dialogWidth: dialog!.offsetWidth,
        dialogHeight: dialog!.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      dialog!.style.left = `${position.left}px`;
      dialog!.style.top = `${position.top}px`;
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      if (dragHandle.hasPointerCapture(pointerId)) {
        dragHandle.releasePointerCapture(pointerId);
      }
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  }

  function resetDialogPosition() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.style.removeProperty("left");
    dialog.style.removeProperty("top");
    dialog.style.removeProperty("margin");
    dialog.style.removeProperty("width");
    dialog.style.removeProperty("height");
  }

  return { startDrag, resetDialogPosition };
}
