import { auth } from "@/lib/auth"; // your NextAuth config re-export
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/dboard");

  // redirect("/api/auth/signin");
  return null;
}
