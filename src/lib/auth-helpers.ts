import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AppSession } from "@/types";

export async function getServerSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;
  // Bloquear usuarios inactivos en todas las APIs
  if (!(session.user as any).activo) return null;
  return session as unknown as AppSession | null;
}

export async function requireAuth(): Promise<AppSession> {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");
  const s = session as AppSession;
  if (!(s.user as any).activo) redirect("/auth/login");
  return s;
}

export async function requireAdmin(): Promise<AppSession> {
  const session = await requireAuth();
  if (session.user.rol !== "administrador") redirect("/dashboard");
  return session;
}