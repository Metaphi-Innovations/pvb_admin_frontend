import type { WheelEvent } from "react";

/** Manual wheel scroll for popovers inside dialogs where native scroll is blocked. */
export function handleScrollableWheelOnElement(
  event: WheelEvent<HTMLElement>,
  element: HTMLElement,
) {
  if (element.scrollHeight <= element.clientHeight) return;

  const atTop = element.scrollTop <= 0;
  const atBottom =
    element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return;

  event.preventDefault();
  event.stopPropagation();
  element.scrollTop += event.deltaY;
}

export function handleScrollableWheel(event: WheelEvent<HTMLElement>) {
  handleScrollableWheelOnElement(event, event.currentTarget);
}
