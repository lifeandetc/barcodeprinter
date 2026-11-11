import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasSquareToken() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN?.trim());
}

export function chunk<T>(values: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

export function squareEnvironment(): "production" | "sandbox" {
  return process.env.SQUARE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
}
