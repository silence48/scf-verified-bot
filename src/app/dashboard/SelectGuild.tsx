// src/app/dashboard/SelectGuild.tsx
"use client";

import { useState } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";

interface GuildInfo {
  id: string;
  name: string;
  // if you pre-fetched members, you can include them here
  // members?: { id: string; name: string }[];
}

interface Props {
  guilds: GuildInfo[];
}

export default function DashboardClient({ guilds }: Props) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  const selectedGuild = guilds.find((g) => g.id === selectedGuildId);

  return (
    <div>
      {/* Example: Just a local state-driven UI. No server action needed if
          all data needed is already included in guilds prop. */}
      <Flex direction="column" gap="2" style={{ marginTop: "1rem" }}>
        <label>Select a guild:</label>
        <select
          value={selectedGuildId ?? ""}
          onChange={(e) => setSelectedGuildId(e.target.value)}
        >
          <option value="">-- Choose a guild --</option>
          {guilds.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          onClick={() => {
            /* maybe do something with selectedGuildId here */
          }}
        >
          View Details
        </Button>
      </Flex>

      {selectedGuild && (
        <div style={{ marginTop: "2rem" }}>
          <Text style={{ fontSize: "1.5rem" }}>
            Guild: {selectedGuild.name} (ID: {selectedGuild.id})
          </Text>
          {/* If you had members in the initial data, you can list them here */}
        </div>
      )}
    </div>
  );
}
