"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

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
    event.currentTarget.setPointerCapture(event.pointerId);
    dialog.style.margin = "0";
    dialog.style.left = `${startLeft}px`;
    dialog.style.top = `${startTop}px`;

    function move(pointerEvent: PointerEvent) {
      const nextLeft = Math.min(
        Math.max(8, startLeft + pointerEvent.clientX - startX),
        Math.max(8, window.innerWidth - dialog!.offsetWidth - 8),
      );
      const nextTop = Math.min(
        Math.max(8, startTop + pointerEvent.clientY - startY),
        Math.max(8, window.innerHeight - 72),
      );
      dialog!.style.left = `${nextLeft}px`;
      dialog!.style.top = `${nextTop}px`;
    }
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
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
