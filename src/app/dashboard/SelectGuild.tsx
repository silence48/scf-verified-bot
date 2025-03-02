// src/app/dashboard/SelectGuild.tsx
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Flex, Text } from "@radix-ui/themes";
import { handleFormSubmit } from "./SelectGuildActions";

interface Guild {
    id: string;
    name: string;
}
interface DetailedGuild {
    id: string;
    name: string;
    members: { id: string; name: string }[];
}

interface Props {
    guilds: Guild[];
}

export default function DashboardClient({ guilds }: Props) {
    const [selectedGuild, setSelectedGuild] = useState<DetailedGuild | null>(null);
    const { pending } = useFormStatus();



    async function formAction(formData: FormData) {
        const result = await handleFormSubmit(formData);
        setSelectedGuild(result.guild);
    }

    return (
        <div>
            <form action={formAction}>
                <Flex direction="column" gap="2" style={{ marginTop: "1rem" }}>
                    <label>Select a guild:</label>
                    <select name="guildId" defaultValue="">
                        <option value="">-- Choose a guild --</option>
                        {guilds.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                    <Button type="submit" disabled={pending}>
                        {pending ? "Loading..." : "View Details"}
                    </Button>
                </Flex>
            </form>

            {selectedGuild && (
                <div style={{ marginTop: "2rem" }}>
                    <Text style={{ fontSize: "1.5rem" }}>
                        Guild: {selectedGuild.name} (ID: {selectedGuild.id})
                    </Text>
                    <Text>Members:</Text>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {selectedGuild.members.map((m) => (
                            <li
                                key={m.id}
                                style={{
                                    padding: "0.5rem",
                                    backgroundColor: "#1e1e1e",
                                    marginBottom: "0.5rem",
                                    borderRadius: "4px",
                                }}
                            >
                                {m.name} (ID: {m.id})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
