import { loadGuildData } from "@/actions/guild";
import { getAllRoles } from "@/actions/roles";
import DashboardClient from "./client";

// Server component
export default async function DashboardPage() {
  // Fetch data on the server side
  const guildId = "897514728459468821";
  const guildData = await loadGuildData(guildId);
  const rolesData = await getAllRoles();

  // Pass data down to your client component
  return (
    <DashboardClient
      initialGuildData={guildData}
      initialRoles={rolesData}
    />
  );
}