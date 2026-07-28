"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Plane, BarChart3, User, Menu, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMapStore } from "@/store/map-store";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const sidebarOpen = useMapStore((s) => s.sidebarOpen);
  const setSidebarOpen = useMapStore((s) => s.setSidebarOpen);
  const setRadarOpen = useMapStore((s) => s.setRadarOpen);
  const radarOpen = useMapStore((s) => s.radarOpen);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 md:p-4">
      <div className="pointer-events-auto mx-auto flex max-w-[1600px] items-center gap-2 md:gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="shrink-0 backdrop-blur-xl"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle filters"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 backdrop-blur-xl"
        >
          <Plane className="h-4 w-4 text-cyan-400" />
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-white md:text-base">
            FlightRadar<span className="text-cyan-400">67</span>
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <GlobalSearch />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant={radarOpen ? "default" : "secondary"}
            size="sm"
            className="backdrop-blur-xl"
            onClick={() => setRadarOpen(!radarOpen)}
          >
            <Radio className="h-3.5 w-3.5" />
            RadarAI
          </Button>
          <Button asChild variant="secondary" size="sm" className="backdrop-blur-xl">
            <Link href="/analytics">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </Link>
          </Button>
          {session?.user ? (
            <>
              <Button asChild variant="secondary" size="sm" className="backdrop-blur-xl">
                <Link href="/profile">
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-slate-300"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="amber" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const setRadarOpen = useMapStore((s) => s.setRadarOpen);
  return (
    <nav className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-slate-950/85 px-2 py-2 backdrop-blur-xl sm:hidden">
      <Link href="/" className="flex flex-col items-center gap-0.5 text-[10px] text-slate-300">
        <Plane className="h-4 w-4 text-cyan-400" />
        Map
      </Link>
      <button
        type="button"
        onClick={() => setRadarOpen(true)}
        className="flex flex-col items-center gap-0.5 text-[10px] text-slate-300"
      >
        <Radio className="h-4 w-4 text-amber-400" />
        AI
      </button>
      <Link href="/analytics" className="flex flex-col items-center gap-0.5 text-[10px] text-slate-300">
        <BarChart3 className="h-4 w-4" />
        Stats
      </Link>
      <Link href="/profile" className="flex flex-col items-center gap-0.5 text-[10px] text-slate-300">
        <User className="h-4 w-4" />
        Me
      </Link>
    </nav>
  );
}

export function LiveBadge({ count, source }: { count: number; source?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-16 left-3 z-20 rounded-lg border border-cyan-500/30 bg-slate-950/75 px-3 py-1.5 font-mono text-[11px] text-cyan-200 backdrop-blur-xl sm:bottom-4"
      )}
    >
      <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      {count.toLocaleString()} tracked
      {source ? <span className="ml-2 text-slate-500">· {source}</span> : null}
    </div>
  );
}
