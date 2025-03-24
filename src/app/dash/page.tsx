// app/dash/page.tsx
import { loadGuildData } from "./actions";
import MembersDashboardClient from "./dashClient";

//export const revalidate = 3600; // revalidate every hour, for example

export default async function MembersPage() {
  // Possibly call your refresh logic right here
  //  so that each time the page is requested (or revalidated),
  //  we do the Discord sync first:
  //await refreshGuildFromDiscord("897514728459468821" );

  // Then load the data (which is presumably up to date)
  const data = await loadGuildData("897514728459468821");
  //console.log(JSON.stringify(data))

  return <MembersDashboardClient guildId="897514728459468821" roleStats={data.roleStats} members={data.members} roleFilters={[]} />;
}
