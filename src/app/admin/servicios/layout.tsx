import { requireAdmin } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 240, minHeight: "100vh", background: "#f4f4f6" }}>
        <div style={{ padding: "36px 40px", maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
