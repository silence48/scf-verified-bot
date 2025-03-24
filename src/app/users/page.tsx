import UsersClient from "./client";
import { loadGuildData } from "@/actions/guild";

export default async function UsersPage() {
  // Load guild data with a static guild ID
  const guildId = "897514728459468821";
  const guildData = await loadGuildData(guildId);

  return (
    <div>
      <UsersClient guildData={guildData} />
    </div>
  );
}
