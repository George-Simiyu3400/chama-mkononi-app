import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getMoney } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/pesa")({
  head: () => ({
    meta: [
      { title: "Pesa ya chama — ChamaMkononi" },
      { name: "description", content: "Pesa iliyoingia, iliyotoka, mikopo na iliyobaki — wazi kwa wote." },
      { property: "og:title", content: "Pesa ya chama — ChamaMkononi" },
      { property: "og:description", content: "Pesa iliyoingia, iliyotoka, mikopo na iliyobaki." },
    ],
  }),
  component: Money,
});

function Money() {
  const fetchFn = useServerFn(getMoney);
  const { t, lang } = useLang();
  const { data } = useChamaQuery(["money"], () => fetchFn());
  const totals = data?.totals;

  return (
    <Screen>
      <PageHeader title={t("money")} subtitle="Hesabu za chama · Money records" />

      <div className="mt-6 grid gap-3">
        <Row label={t("moneyIn")} value={ksh(totals?.in ?? 0)} strong />
        <Row label={t("moneyOut")} value={ksh(totals?.out ?? 0)} />
        <Row label={t("loansGiven")} value={ksh(totals?.loans ?? 0)} />
        <Row label={t("repayments")} value={ksh(totals?.repayments ?? 0)} />
        <Row label={t("balance")} value={ksh(totals?.balance ?? 0)} strong />
      </div>

      <p className="mt-6 font-display text-xl font-bold">Kila kitu kilichoandikwa</p>
      <div className="mt-3 grid gap-3">
        {(data?.entries ?? []).map((e: any) => (
          <div key={e.id} className="rounded-2xl border border-card/70 bg-card/70 p-4">
            <p className="font-display text-lg font-bold">
              {e.kind === "in" ? "⬇ Imeingia" : "⬆ Imetoka"} {ksh(e.amount)}
            </p>
            <p className="text-base">{e.description ?? e.category}</p>
            <p className="text-sm text-muted-foreground">
              {formatDay(e.occurred_on, lang)} · {t("recordedBy")}: {nameOf(data, e.recorded_by)} · {t("approvedBy")}:{" "}
              {nameOf(data, e.approved_by)}
            </p>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function nameOf(data: any, userId: string | null) {
  if (!userId) return "—";
  const found = (data?.names ?? []).find((n: any) => n.user_id === userId);
  return found?.display_name ?? "mwanachama";
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-card/70 bg-card/70 px-4 py-4">
      <span className="text-lg">{label}</span>
      <span className={`font-display ${strong ? "text-2xl" : "text-xl"} font-extrabold`}>{value}</span>
    </div>
  );
}
