// app/dash/page.tsx
import { loadGuildData } from "./actions";
import MembersDashboardClient from "./dashClient";

const GUILD_ID = "897514728459468821";

/**
 * A SERVER component. Called for every request or on re-validation, etc.
 * We fetch the data from the DB and pass it to a client component for ephemeral state.
 */
export default async function MembersPage() {
  // 1) Fetch the fresh data from the DB
  //    If you want to run a 'refreshGuildFromDiscord' here, you can do so too.
  const data = await loadGuildData(GUILD_ID);

  // 2) Return a client component that handles local filters, etc.
  return (
    <MembersDashboardClient
      guildId={GUILD_ID}
      roleStats={data.roleStats}
      members={data.members}
    />
  );
}
