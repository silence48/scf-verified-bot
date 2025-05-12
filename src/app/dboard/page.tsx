import { Suspense } from "react";
import { loadGuildData } from "@/actions/guild";
import { getAllRoles } from "@/actions/roles";
import SearchContainer from "./components/SearchContainer";
import RoleStatsSection from "./components/RoleStats";
import GuildStats from "./components/GuildStats";
import RecentUsersSection from "./components/RecentUsers";
import RolesSection from "./components/RolesList";

export default async function DashboardPage() {
  // Fetch shared data on the server
  const guildId = "897514728459468821";
  const initialGuildData = await loadGuildData(guildId);
  const initialRoles = await getAllRoles();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
      </div>
      
      <SearchContainer />
      
      <div className="space-y-8">
        <Suspense fallback={<div className="flex justify-center p-4"><div className="spinner"></div></div>}>
          <RoleStatsSection roles={initialRoles} />
        </Suspense>
        
        <Suspense fallback={<div className="flex justify-center p-4"><div className="spinner"></div></div>}>
          <GuildStats guildData={initialGuildData} roles={initialRoles} />
        </Suspense>
        
        <Suspense fallback={<div className="flex justify-center p-4"><div className="spinner"></div></div>}>
          <RecentUsersSection guildData={initialGuildData} />
        </Suspense>
        
        <Suspense fallback={<div className="flex justify-center p-4"><div className="spinner"></div></div>}>
          <RolesSection roles={initialRoles} />
        </Suspense>
      </div>
    </div>
  );
}