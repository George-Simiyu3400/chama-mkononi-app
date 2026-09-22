import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { ConfirmSheet } from "@/components/chama/ConfirmSheet";
import { getContributions, recordContribution } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/changia")({
  head: () => ({
    meta: [
      { title: "Changia — ChamaMkononi" },
      { name: "description", content: "Lipa mchango wako wa mwezi na uone historia yako." },
      { property: "og:title", content: "Changia — ChamaMkononi" },
      { property: "og:description", content: "Lipa mchango wako wa mwezi na uone historia yako." },
    ],
  }),
  component: Contribute,
});

function Contribute() {
  const fetchFn = useServerFn(getContributions);
  const recordFn = useServerFn(recordContribution);
  const qc = useQueryClient();
  const { t } = useLang();
  const { data } = useChamaQuery(["contributions"], () => fetchFn());
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<"mpesa_mock" | "cash">("mpesa_mock");

  const record = useMutation({
    mutationFn: (value: number) => recordFn({ data: { amount: value, method } }),
    onSuccess: (res) => {
      setAmount(null);
      toast.success(
        res.status === "confirmed" ? "Imewekwa kwenye kitabu cha chama." : "Asante. Mweka hazina atathibitisha.",
      );
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana. Jaribu tena."),
  });

  const monthly = data?.monthly ?? 500;
  const quick = [monthly, 500, 1000, 2000];

  return (
    <Screen>
      <PageHeader title={t("contribute")} subtitle="Contribute" />

      <p className="mt-6 text-lg font-bold">Chagua kiasi · Choose amount</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from(new Set(quick)).map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className="rounded-3xl border border-card/70 bg-card/70 py-7 font-display text-2xl font-extrabold backdrop-blur-md"
          >
            {ksh(v)}
          </button>
        ))}
      </div>

      <p className="mt-6 text-lg font-bold">Njia ya kulipa · Payment way</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => setMethod("mpesa_mock")}
          className={`rounded-2xl py-5 text-lg font-bold ${method === "mpesa_mock" ? "bg-brand text-cream" : "border border-border bg-card"}`}
        >
          📱 M-Pesa (mfano)
        </button>
        <button
          onClick={() => setMethod("cash")}
          className={`rounded-2xl py-5 text-lg font-bold ${method === "cash" ? "bg-brand text-cream" : "border border-border bg-card"}`}
        >
          💵 Pesa mkononi
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        M-Pesa bado haijaunganishwa — malipo yanaandikwa kwenye kitabu tu. (Mock service, not a real payment.)
      </p>

      <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
        <p className="font-display text-lg font-bold">Michango yangu · My records</p>
        <div className="mt-3 grid gap-2">
          {(data?.mine ?? []).slice(0, 8).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 text-base">
              <span>
                {c.period} · {c.method === "cash" ? "pesa mkononi" : "M-Pesa"}
              </span>
              <span className="font-bold">
                {ksh(c.amount)}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {c.status === "confirmed" ? "✓ imethibitishwa" : c.status === "pending" ? "⏳ inasubiri" : "✕ imekataliwa"}
                </span>
              </span>
            </div>
          ))}
          {(data?.mine ?? []).length === 0 ? <p className="text-base">Bado hujachanga.</p> : null}
        </div>
      </div>

      <ConfirmSheet
        open={amount !== null}
        question={`${t("confirmQuestion")} ${ksh(amount ?? 0)}?`}
        detail={method === "cash" ? "Pesa mkononi" : "M-Pesa (mfano)"}
        busy={record.isPending}
        onConfirm={() => record.mutate(amount!)}
        onCancel={() => setAmount(null)}
      />
    </Screen>
  );
}
