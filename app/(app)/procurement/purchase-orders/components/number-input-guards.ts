import type { KeyboardEvent } from "react";

const BLOCKED_NUMBER_KEYS = ["e", "E", "+", "-"];

export function preventInvalidNumberKeys(event: KeyboardEvent<HTMLInputElement>) {
  if (BLOCKED_NUMBER_KEYS.includes(event.key)) {
    event.preventDefault();
  }
}

export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(/[^0-9.]/g, "");
  const firstDotIndex = normalized.indexOf(".");
  if (firstDotIndex === -1) return normalized;

  const integerPart = normalized.slice(0, firstDotIndex);
  const fractionalPart = normalized.slice(firstDotIndex + 1).replace(/\./g, "");
  return `${integerPart}.${fractionalPart}`;
}
