import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Screen } from "@/components/chama/Screen";
import { BigButton } from "@/components/chama/BigButton";
import { getHome, saveRsvp } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { formatDay, ksh, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/nyumbani")({
  head: () => ({
    meta: [
      { title: "Nyumbani — ChamaMkononi" },
      { name: "description", content: "Pesa ya chama, mchango wako, mkopo na mkutano ujao." },
      { property: "og:title", content: "Nyumbani — ChamaMkononi" },
      { property: "og:description", content: "Pesa ya chama, mchango wako, mkopo na mkutano ujao." },
    ],
  }),
  component: Home,
});

const roleWords: Record<string, string> = {
  chairperson: "Mwenyekiti",
  treasurer: "Mweka hazina",
  secretary: "Katibu",
  member: "Mwanachama",
};

function Home() {
  const fetchHome = useServerFn(getHome);
  const rsvpFn = useServerFn(saveRsvp);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const { data, isLoading, offline } = useChamaQuery(["home"], () => fetchHome());

  const rsvp = useMutation({
    mutationFn: (response: "coming" | "not_coming") =>
      rsvpFn({ data: { meetingId: data!.meeting!.id, response } }),
    onSuccess: () => {
      toast.success("Asante, tumeweka jibu lako.");
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("Imeshindikana. Jaribu tena."),
  });

  useEffect(() => {
    if (data && !data.member) navigate({ to: "/jiunge", replace: true });
  }, [data, navigate]);

  if (isLoading && !data) {
    return (
      <Screen>
        <p className="mt-10 text-center text-xl">{t("loading")}</p>
      </Screen>
    );
  }
  if (!data?.member) return <Screen />;

  const initials = data.member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand font-display text-lg font-extrabold text-cream">
            {data.chama.name[0]}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">ChamaMkononi</p>
            <p className="font-display text-base font-bold leading-tight">{data.chama.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "sw" ? "en" : "sw")}
            className="grid size-11 place-items-center rounded-full border border-brand/20 bg-card/70 text-sm font-bold text-brand"
            aria-label="Badilisha lugha · Change language"
          >
            {lang === "sw" ? "EN" : "SW"}
          </button>
          <Link
            to="/chama"
            className="grid size-11 place-items-center rounded-full bg-foreground/5 font-display text-sm font-bold"
            aria-label={t("myChama")}
          >
            {initials}
          </Link>
        </div>
      </header>

      {offline ? (
        <p className="mt-4 rounded-2xl border border-border bg-card/70 p-3 text-center text-base font-bold">
          {t("offline")}
        </p>
      ) : null}

      <div className="mt-6">
        <p className="text-lg text-foreground/70">
          {t("greeting")}, {data.member.name} 👋 · {roleWords[data.member.role]}
        </p>
        <div className="mt-3 rounded-3xl border border-card/70 bg-card/70 p-5 backdrop-blur-md">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand">{t("chamaMoney")}</p>
          <p className="mt-1 font-display text-4xl font-extrabold leading-none">{ksh(data.balance)}</p>
          <p className="mt-3 text-lg">
            {data.month.remaining === 0 ? (
              <span className="font-bold">✓ {t("paidAll")}</span>
            ) : (
              <>
                <span className="font-bold">{t("haveYouPaid")}</span>{" "}
                <span className="font-bold">
                  {t("stillOwe")} {ksh(data.month.remaining)}
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {t("myShare")}: {ksh(data.month.paid)} / {ksh(data.month.required)} · {data.month.period}
          </p>
          <p className="mt-2 text-base">
            {t("loanOwed")}:{" "}
            <span className="font-bold">{data.loan.remaining === 0 ? "Hakuna · None" : ksh(data.loan.remaining)}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <BigButton
          wide
          tone="brand"
          icon="💸"
          to="/changia"
          title={t("contribute")}
          subtitle={
            data.month.remaining > 0 ? `${t("stillOwe")} ${ksh(data.month.remaining)}` : t("paidAll")
          }
        />
        <BigButton icon="👥" to="/chama" title={t("myChama")} subtitle="My Chama" />
        <BigButton icon="🤝" to="/mikopo" title={t("loans")} subtitle="Loans" />
        <BigButton icon="📅" to="/mikutano" title={t("meetings")} subtitle="Meetings" />
        <BigButton icon="📖" to="/kitabu" title={t("book")} subtitle="Chama Book" />
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-3xl border border-card/70 bg-card/70 p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-2xl" aria-hidden="true">
              📍
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">{t("nextMeeting")}</p>
              {data.meeting ? (
                <>
                  <p className="font-display text-lg font-bold leading-tight">
                    {formatDay(data.meeting.meet_on, lang)} · {String(data.meeting.meet_at).slice(0, 5)}
                  </p>
                  <p className="text-base text-muted-foreground">{data.meeting.location}</p>
                </>
              ) : (
                <p className="text-lg font-bold">Hakuna mkutano bado</p>
              )}
            </div>
          </div>
          {data.meeting ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => rsvp.mutate("coming")}
                className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                  data.myRsvp === "coming" ? "bg-brand text-cream" : "border border-border bg-card"
                }`}
              >
                ✓ {t("coming")}
              </button>
              <button
                onClick={() => rsvp.mutate("not_coming")}
                className={`rounded-2xl py-4 font-display text-lg font-extrabold ${
                  data.myRsvp === "not_coming" ? "bg-ink text-cream" : "border border-border bg-card"
                }`}
              >
                ✕ {t("notComing")}
              </button>
            </div>
          ) : null}
        </div>

        {data.announcement ? (
          <div className="flex items-center gap-3 rounded-3xl border border-warn/50 bg-warn-soft p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn/30 text-xl" aria-hidden="true">
              📢
            </span>
            <p className="text-base leading-snug">
              <span className="font-bold">{t("announcement")}: </span>
              {data.announcement.message}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <BigButton icon="💰" to="/pesa" title={t("money")} subtitle="Money records" />
          <BigButton icon="🆘" to="/msaada" title={t("help")} subtitle="Help" />
        </div>

        <button
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
          className="rounded-2xl border border-border bg-card py-4 text-lg font-bold"
        >
          {t("signOut")}
        </button>
      </div>
    </Screen>
  );
}
