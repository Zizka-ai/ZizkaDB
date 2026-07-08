"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { Search, Settings, LogOut, Cpu } from "lucide-react";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { TenantPlanBanner } from "@/components/TenantPlanBanner";

const nav = [
  { href: "/dashboard", label: "Agents", icon: Cpu },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    clearToken();
    router.push("/login");
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0a0a0a" }}
    >
      {/* Sidebar — hidden on mobile */}
      <aside
        className="hidden sm:flex w-56 flex-col shrink-0 border-r"
        style={{ background: "#0d0d0d", borderColor: "#1f1f1f" }}
      >
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1f1f1f" }}>
          <div className="flex items-center gap-2">
            <BrandLogo variant="mark" showWordmark={false} href="/dashboard" />
            <span className="text-white font-semibold">ZizkaDB</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition"
                style={{
                  color: active ? "#fff" : "#e5e5e5",
                  background: active ? "#1a1a1a" : "transparent",
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: "#1f1f1f" }}>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full transition"
            style={{ color: "#e5e5e5" }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="flex sm:hidden items-center justify-between px-4 py-3 border-b"
          style={{ background: "#0d0d0d", borderColor: "#1f1f1f" }}
        >
          <div className="flex items-center gap-2">
            <BrandLogo variant="mark" showWordmark={false} href="/dashboard" />
            <span className="text-white font-semibold text-sm">ZizkaDB</span>
          </div>
          <button onClick={signOut} style={{ color: "#e5e5e5" }}>
            <LogOut size={16} />
          </button>
        </div>

        <main className="flex-1 overflow-auto pb-16 sm:pb-0">
          <TenantPlanBanner />
          <ConnectionStatus />
          {children}
        </main>

        <nav
          className="flex sm:hidden border-t"
          style={{ background: "#0d0d0d", borderColor: "#1f1f1f" }}
        >
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center gap-1 py-3 text-xs"
                style={{ color: active ? "#22c55e" : "#e5e5e5" }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
