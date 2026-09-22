import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { GlassField } from "@/components/chama/GlassField";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Ingia — ChamaMkononi" },
      { name: "description", content: "Ingia kwenye chama chako. Sign in to your chama." },
      { property: "og:title", content: "Ingia — ChamaMkononi" },
      { property: "og:description", content: "Ingia kwenye chama chako." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLang();
  const [signup, setSignup] = useState(mode === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 6) {
      toast.error("Nywila lazima iwe na herufi 6 au zaidi");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pin,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        navigate({ to: "/jiunge" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
        if (error) throw error;
        navigate({ to: "/nyumbani" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindikana. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">Angalia barua pepe yako</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Tumekutumia kiungo kwa {email}. Bofya kiungo hicho kisha urudi hapa kuingia.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-extrabold">{signup ? t("signUp") : t("signIn")}</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {signup ? "Jaza majina yako na nywila ya siri." : "Weka barua pepe na nywila yako ya siri."}
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-4">
        {signup ? (
          <Field label="Jina lako · Your name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl"
              placeholder="Mama Wanjiku"
            />
          </Field>
        ) : null}
        <Field label="Barua pepe · Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl"
            placeholder="mama@mfano.co.ke"
          />
        </Field>
        <Field label="Nywila ya siri · Secret password">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            required
            minLength={6}
            autoComplete={signup ? "new-password" : "current-password"}
            className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl tracking-widest"
            placeholder="••••••"
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="rounded-3xl bg-brand py-6 font-display text-2xl font-extrabold text-cream disabled:opacity-60"
        >
          {busy ? t("loading") : signup ? t("signUp") : t("signIn")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setSignup((s) => !s)}
        className="mt-6 w-full rounded-2xl border border-border bg-card py-5 text-lg font-bold"
      >
        {signup ? "Nina akaunti tayari — Ingia" : "Sina akaunti — Jisajili"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <GlassField />
      <div className="relative mx-auto w-full max-w-md px-5 py-10">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold">{label}</span>
      {children}
    </label>
  );
}
