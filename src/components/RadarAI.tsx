"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Radio, Send, X } from "lucide-react";
import { useMapStore } from "@/store/map-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function RadarAI() {
  const open = useMapStore((s) => s.radarOpen);
  const setRadarOpen = useMapStore((s) => s.setRadarOpen);
  const selectedFlightId = useMapStore((s) => s.selectedFlightId);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "RadarAI online. Ask about traffic density, busy airports, top airlines, or routes like SYD to SIN.",
    },
  ]);
  const [input, setInput] = useState("");

  const mutation = useMutation({
    mutationFn: async (next: Msg[]) => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, selectedFlightId }),
      });
      if (!res.ok) throw new Error("AI failed");
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data.message]);
    },
  });

  function send() {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setRadarOpen(true)}
        className={cn(
          "pointer-events-auto absolute bottom-20 right-3 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-105 sm:bottom-6 sm:right-6",
          open && "hidden"
        )}
        aria-label="Open RadarAI"
      >
        <Radio className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "pointer-events-auto absolute bottom-16 right-3 z-30 flex w-[min(100%-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl transition-all duration-300 md:bottom-6 md:right-6",
          open ? "h-[min(70vh,520px)] opacity-100" : "pointer-events-none h-0 opacity-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-sm font-semibold text-white">RadarAI</p>
              <p className="text-[10px] text-slate-500">Aviation intelligence assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setRadarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                m.role === "assistant"
                  ? "bg-white/5 text-slate-200"
                  : "ml-auto bg-cyan-500/20 text-cyan-50"
              )}
            >
              {m.content}
            </div>
          ))}
          {mutation.isPending && (
            <p className="text-xs text-slate-500">Querying live traffic…</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/10 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about the sky…"
            className="bg-slate-900/80"
          />
          <Button size="icon" onClick={send} disabled={mutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
