import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Dashboard } from "@/components/dashboard";
import { AppLayout } from "@/components/layout/AppLayout";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allUsers = await db.select().from(users);
  if (allUsers.length === 0) {
    redirect("/setup");
  }

  return (
    <AppLayout title="Dashboard">
      <Dashboard />
    </AppLayout>
  );
}
