import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRoleDotColor(roleName: string): string {
  switch (roleName) {
    case "Navigator":
      return "text-indigo-400";
    case "Pilot":
      return "text-purple-400";
    case "Pathfinder":
      return "text-blue-400";
    case "Verified":
      return "text-emerald-400";
    default:
      return "text-gray-400";
  }
}

// Format date function
export function formatDate(dateValue: string | Date | number): string {
  if (!dateValue) return "Unknown";

  try {
    if (typeof dateValue === "string" || typeof dateValue === "number") {
      return new Date(dateValue).toLocaleDateString();
    }
    return dateValue.toLocaleDateString();
  } catch (err) {
    throw new Error(`Invalid date: ${dateValue}, ${err}`);
  }
}