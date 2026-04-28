"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell({
  brand,
  nav,
  children,
}: {
  brand: string;
  nav: { label: string; href: string; icon?: React.ReactNode }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supa = createClient();
    await supa.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <Link href="/" className="px-4 h-14 flex items-center gap-2 border-b border-slate-100">
          <div className="h-7 w-7 rounded bg-brand text-white grid place-items-center text-xs font-bold">S</div>
          <span className="font-semibold">{brand}</span>
        </Link>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 px-3 h-9 rounded-md text-sm",
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {n.icon}
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-slate-50">{children}</main>
    </div>
  );
}
