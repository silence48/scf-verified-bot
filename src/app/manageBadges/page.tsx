import { getBadges } from "./actions";
import { BadgeManager } from "./client";

export default async function ManageBadgesPage() {
  const badges = await getBadges();
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Manage Badges</h1>
      <BadgeManager initialBadges={badges} />
    </div>
  );
}