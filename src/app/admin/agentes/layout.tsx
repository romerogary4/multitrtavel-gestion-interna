import { requireAuth } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, minHeight: "100vh", background: "#f4f4f6" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}