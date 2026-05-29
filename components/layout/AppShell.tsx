"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronRight, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface AppShellProps {
  brand: string;
  nav: NavItem[];
  children: React.ReactNode;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-violet-600 text-white grid place-items-center text-xs font-bold shrink-0">
      {initials || "?"}
    </div>
  );
}

export function AppShell({ brand, nav, children }: AppShellProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const supa = createClient();
    supa.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? "",
          name: (data.user.user_metadata as { display_name?: string })?.display_name ?? data.user.email ?? "",
        });
      }
    });
  }, []);

  async function logout() {
    const supa = createClient();
    await supa.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Header */}
      <header className="md:hidden flex h-14 items-center justify-between px-4 border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm">
        <Link href="/" className="flex items-center gap-2 select-none">
          <img src="/samaajsetu.webp" alt="Logo" className="h-6 w-6 object-contain" />
          <span className="font-semibold text-slate-900 text-sm">{t(brand)}</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={cn(
          "w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm transition-all duration-300",
          // Desktop positioning
          "hidden md:flex sticky top-0 h-screen",
          // Mobile drawer positioning
          "fixed md:sticky top-0 bottom-0 left-0 z-50 transform",
          mobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand (Desktop only) */}
        <div className="hidden md:flex px-4 h-14 items-center gap-2.5 border-b border-slate-100 select-none">
          <img src="/samaajsetu.webp" alt="Logo" className="h-7 w-7 object-contain" />
          <span className="font-semibold text-slate-900 truncate">{t(brand)}</span>
        </div>

        {/* Brand Header for Mobile Drawer */}
        <div className="md:hidden flex px-4 h-14 items-center justify-between border-b border-slate-100 select-none">
          <div className="flex items-center gap-2">
            <img src="/samaajsetu.webp" alt="Logo" className="h-6 w-6 object-contain" />
            <span className="font-semibold text-slate-900 text-sm">{t(brand)}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-all",
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className={cn("shrink-0", active ? "text-brand" : "text-slate-400 group-hover:text-slate-600")}>
                  {n.icon}
                </span>
                <span className="flex-1 truncate">{t(n.label)}</span>
                {active && <ChevronRight className="h-3 w-3 text-brand/50 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          {user ? (
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
              <Avatar name={user.name} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
              <button
                onClick={logout}
                title={t("Sign out")}
                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("Sign out")}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
