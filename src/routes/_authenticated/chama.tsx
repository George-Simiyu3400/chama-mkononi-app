import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Screen } from "@/components/chama/Screen";
import { getMembers, postAnnouncement, removeTrustedHelper, setTrustedHelper } from "@/lib/chama.functions";
import { useChamaQuery } from "@/lib/useChamaQuery";
import { ksh, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/chama")({
  head: () => ({
    meta: [
      { title: "Chama Yangu — ChamaMkononi" },
      { name: "description", content: "Wanachama, kazi zao, na msaidizi wako wa kuaminika." },
      { property: "og:title", content: "Chama Yangu — ChamaMkononi" },
      { property: "og:description", content: "Wanachama, kazi zao, na msaidizi wako wa kuaminika." },
    ],
  }),
  component: MyChama,
});

const roleWords: Record<string, string> = {
  chairperson: "Mwenyekiti · Chairperson",
  treasurer: "Mweka hazina · Treasurer",
  secretary: "Katibu · Secretary",
  member: "Mwanachama · Member",
};

function MyChama() {
  const fetchFn = useServerFn(getMembers);
  const helperFn = useServerFn(setTrustedHelper);
  const removeFn = useServerFn(removeTrustedHelper);
  const announceFn = useServerFn(postAnnouncement);
  const qc = useQueryClient();
  const { t } = useLang();
  const { data } = useChamaQuery(["members"], () => fetchFn());
  const [message, setMessage] = useState("");

  const addHelper = useMutation({
    mutationFn: (helperMemberId: string) => helperFn({ data: { helperMemberId, canRecord: true } }),
    onSuccess: () => {
      toast.success("Msaidizi amewekwa.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Imeshindikana."),
  });

  const dropHelper = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Msaidizi ameondolewa.");
      qc.invalidateQueries();
    },
  });

  const announce = useMutation({
    mutationFn: () => announceFn({ data: { message } }),
    onSuccess: () => {
      setMessage("");
      toast.success("Tangazo limetumwa.");
      qc.invalidateQueries();
    },
    onError: () => toast.error("Huna ruhusa ya kutangaza."),
  });

  const canAnnounce = data?.member?.role && data.member.role !== "member";

  return (
    <Screen>
      <PageHeader title={t("myChama")} subtitle={data?.chama?.name} />

      <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
        <p className="text-lg">
          Mchango wa mwezi: <span className="font-bold">{ksh(data?.chama?.monthly ?? 0)}</span>
        </p>
        <p className="text-lg">
          Nambari ya chama: <span className="font-bold">{data?.chama?.joinCode}</span>
        </p>
        <p className="text-base text-muted-foreground">Kazi yako: {roleWords[data?.member?.role ?? "member"]}</p>
      </div>

      <p className="mt-6 font-display text-xl font-bold">Wanachama</p>
      <div className="mt-3 grid gap-2">
        {(data?.members ?? []).map((m: any) => (
          <div key={m.id} className="rounded-2xl border border-card/70 bg-card/70 px-4 py-4">
            <p className="text-lg font-bold">{m.display_name}</p>
            <p className="text-base text-muted-foreground">{roleWords[m.role]}</p>
            {m.phone ? <p className="text-base">📞 {m.phone}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
        <p className="font-display text-xl font-bold">Msaidizi wa kuaminika</p>
        <p className="mt-1 text-base text-muted-foreground">
          Msaidizi anaweza kuona taarifa zako na kukusaidia kuandika. Hawezi kutoa pesa, kukubali mkopo, wala
          kubadilisha akaunti yako.
        </p>
        <div className="mt-3 grid gap-2">
          {(data?.helpers ?? []).map((h: any) => {
            const person = (data?.members ?? []).find((m: any) => m.id === h.helper_member_id);
            return (
              <div key={h.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <span className="text-lg font-bold">{person?.display_name ?? "Msaidizi"}</span>
                <button onClick={() => dropHelper.mutate(h.id)} className="text-base font-bold underline">
                  Ondoa
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2">
          {(data?.members ?? [])
            .filter(
              (m: any) =>
                m.id !== data?.member?.id && !(data?.helpers ?? []).some((h: any) => h.helper_member_id === m.id),
            )
            .map((m: any) => (
              <button
                key={m.id}
                onClick={() => addHelper.mutate(m.id)}
                className="rounded-2xl border border-border bg-card px-4 py-4 text-left text-lg font-bold"
              >
                + Mpe {m.display_name} ruhusa ya kunisaidia
              </button>
            ))}
        </div>
      </div>

      {canAnnounce ? (
        <div className="mt-6 rounded-3xl border border-card/70 bg-card/70 p-4">
          <p className="font-display text-xl font-bold">Tuma tangazo</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
            placeholder="Habari wanachama…"
          />
          <button
            disabled={message.length < 3 || announce.isPending}
            onClick={() => announce.mutate()}
            className="mt-3 w-full rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-50"
          >
            TUMA TANGAZO
          </button>
        </div>
      ) : null}
    </Screen>
  );
}
