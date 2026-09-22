import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/chama/Screen";
import { claimSlot, listOpenSlots } from "@/lib/chama.functions";

export const Route = createFileRoute("/_authenticated/jiunge")({
  head: () => ({
    meta: [
      { title: "Jiunge na chama — ChamaMkononi" },
      { name: "description", content: "Chagua jina lako kwenye orodha ya chama chako." },
      { property: "og:title", content: "Jiunge na chama — ChamaMkononi" },
      { property: "og:description", content: "Chagua jina lako kwenye orodha ya chama chako." },
    ],
  }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const slotsFn = useServerFn(listOpenSlots);
  const claimFn = useServerFn(claimSlot);
  const [code, setCode] = useState("TUPENDANE");
  const [search, setSearch] = useState("TUPENDANE");

  const { data, isFetching } = useQuery({
    queryKey: ["slots", search],
    queryFn: () => slotsFn({ data: { code: search } }),
    enabled: search.length >= 3,
  });

  const claim = useMutation({
    mutationFn: (memberId: string) => claimFn({ data: { memberId } }),
    onSuccess: () => navigate({ to: "/nyumbani", replace: true }),
    onError: () => toast.error("Jina hilo limeshachukuliwa. Chagua lingine."),
  });

  return (
    <Screen nav={false}>
      <h1 className="font-display text-3xl font-extrabold">Jiunge na chama chako</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Weka nambari ya chama, kisha bonyeza jina lako. · Enter your chama code, then tap your name.
      </p>

      <div className="mt-6 grid gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl tracking-widest"
          placeholder="TUPENDANE"
        />
        <button
          onClick={() => setSearch(code.trim())}
          className="rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream"
        >
          TAFUTA CHAMA
        </button>
      </div>

      {isFetching ? <p className="mt-6 text-lg">Inatafuta…</p> : null}

      {data?.chama ? (
        <div className="mt-6">
          <p className="font-display text-xl font-bold">{data.chama.name}</p>
          <p className="mb-3 text-base text-muted-foreground">Bonyeza jina lako:</p>
          <div className="grid gap-3">
            {data.slots.map((s: { id: string; display_name: string; role: string }) => (
              <button
                key={s.id}
                onClick={() => claim.mutate(s.id)}
                disabled={claim.isPending}
                className="rounded-2xl border border-border bg-card px-5 py-5 text-left font-display text-xl font-bold"
              >
                {s.display_name}
                <span className="block text-sm font-medium text-muted-foreground">{s.role}</span>
              </button>
            ))}
            {data.slots.length === 0 ? (
              <p className="text-lg">Hakuna majina yaliyobaki kwenye chama hiki.</p>
            ) : null}
          </div>
        </div>
      ) : data && !data.chama ? (
        <p className="mt-6 text-lg">Hatujapata chama chenye nambari hiyo.</p>
      ) : null}
    </Screen>
  );
}
