// src/app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { client } from "@/lib/Discord-Client";
import DashboardClient from "./SelectGuild";

export default async function DashboardPage() {
    const session = await auth();
    if (!session) redirect("/");

    const allowedAdminIds = [
        "248918075922055168",
        "378384721660346378",
        "610091022051180544",
        "755851928461901936",
    ];
    if (!allowedAdminIds.includes(session.user.id)) {
        return <div style={{ padding: 40 }}>Unauthorized</div>;
    }

    // Build guild list server-side
    const guilds = client.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
    }));

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Dashboard</h2>
            <DashboardClient guilds={guilds} />
        </div>
    );
}
