"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@flightradar67.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12),transparent_50%),linear-gradient(160deg,#070b14,#101a2e)] px-4">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10">
            <Plane className="h-6 w-6 text-cyan-400" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            Sign in to FlightRadar67
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Save flights and favourite airports. Demo: demo@flightradar67.com / password123
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/profile" })}
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signIn("github", { callbackUrl: "/profile" })}
          >
            Continue with GitHub
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            OAuth buttons require AUTH_GOOGLE_* / AUTH_GITHUB_* env vars.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-cyan-400 hover:underline">
            Back to map
          </Link>
        </p>
      </div>
    </div>
  );
}
