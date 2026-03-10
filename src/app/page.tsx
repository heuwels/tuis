import { Dashboard } from "@/components/dashboard";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Home() {
  return (
    <AppLayout title="Dashboard">
      <Dashboard />
    </AppLayout>
  );
}
