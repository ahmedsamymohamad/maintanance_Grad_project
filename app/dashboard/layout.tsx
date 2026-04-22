import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard/nav";
import { ChatbotWrapper } from "@/components/dashboard/chatbot-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const user = await requireCurrentUser();

    console.log("[DashboardLayout] User authenticated:", {
      userId: user.id,
      role: user.role,
    });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[DashboardLayout] Profile fetch error:", profileError);
    }

    if (!profile) {
      console.error("[DashboardLayout] No profile found for user:", user.id);
      redirect("/auth/login");
    }

    console.log("[DashboardLayout] Profile loaded:", {
      role: profile.role,
      email: profile.email,
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
        <DashboardNav profile={profile} />
        <main className="container mx-auto p-6 lg:p-8">{children}</main>
        {profile.role == "user" ? <ChatbotWrapper /> : null}
      </div>
    );
  } catch (error) {
    console.error("[DashboardLayout] Unexpected error:", error);
    redirect("/auth/login");
  }
}
