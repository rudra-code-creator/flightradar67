"use client";

import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import Link from "next/link";

export function FavouriteAirportButton({ code }: { code: string }) {
  const { data: session } = useSession();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/favourites/airports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportCode: code }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/login">Sign in to favourite</Link>
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="amber"
      disabled={mutation.isPending || mutation.isSuccess}
      onClick={() => mutation.mutate()}
    >
      <Heart className="h-3.5 w-3.5" />
      {mutation.isSuccess ? "Favourited" : "Favourite airport"}
    </Button>
  );
}
