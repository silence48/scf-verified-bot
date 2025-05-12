import { TierRole } from "@/types/roles";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function discordColorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Check if a color is very light (to decide text color)
export function isLightColor(hexColor: string): boolean {
  // Remove the # if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate perceived brightness (YIQ formula)
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  
  return brightness > 0.6; // Threshold for light colors
}

// Get tier color name based on role name
export function getTierColorName(roleName: string): string {
  if (roleName.includes("Verified")) return "verified";
  if (roleName.includes("Pathfinder")) return "pathfinder";
  if (roleName.includes("Navigator")) return "navigator";
  if (roleName.includes("Pilot")) return "pilot";
  return "default";
}

// Fixed colors for our main tier roles (more reliable than the Discord values)
export function getTierColorByName(tier: string): string {
  switch (tier) {
    case "SCF Verified": return "#10b981"; // emerald-500
    case "SCF Pathfinder": return "#3b82f6"; // blue-500
    case "SCF Navigator": return "#6366f1"; // indigo-500
    case "SCF Pilot": return "#a855f7"; // purple-500
    default: return "#6b7280"; // gray-500
  }
}

// Get a role color, preferring our fixed values for main roles
export function getRoleColor(role: TierRole): string {
  // Check if it's one of our main tier roles first
  const mainRoleColor = getTierColorByName(role.roleName);
  if (mainRoleColor !== "#6b7280") {
    return mainRoleColor;
  }
  
  // Otherwise use the Discord color
  if (role.role?.color) {
    return discordColorToHex(role.role.color);
  }
  
  // Fallback
  return "#6b7280";
}