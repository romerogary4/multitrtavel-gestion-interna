import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-helpers";

export default async function HomePage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/auth/login");
  }
}
