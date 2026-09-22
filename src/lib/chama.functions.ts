import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * All chama business logic lives here, on the server.
 * Balances and loan figures are always calculated from stored records —
 * never stored as a hard-coded number, never trusted from the client.
 */

const OFFICIALS = ["chairperson", "treasurer"] as const;

type Sb = { from: (t: string) => any };

async function currentMember(sb: Sb, userId: string) {
  const { data, error } = await sb
    .from("chama_members")
    .select("id, chama_id, display_name, role, chamas(id, name, monthly_contribution, join_code)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as null | {
    id: string;
    chama_id: string;
    display_name: string;
    role: "chairperson" | "treasurer" | "secretary" | "member";
    chamas: { id: string; name: string; monthly_contribution: number; join_code: string };
  };
}

function period(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sum(rows: { amount: number | string }[]) {
  return rows.reduce((a, r) => a + Number(r.amount), 0);
}

/* ------------------------------------------------------------------ */
/* Membership                                                          */
/* ------------------------------------------------------------------ */

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await currentMember(context.supabase as Sb, context.userId);
    return { member: m };
  });

/** Names in a chama that nobody has claimed yet — used when joining. */
export const listOpenSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: chama } = await supabaseAdmin
      .from("chamas")
      .select("id, name")
      .eq("join_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (!chama) return { chama: null, slots: [] };
    const { data: slots } = await supabaseAdmin
      .from("chama_members")
      .select("id, display_name, role")
      .eq("chama_id", chama.id)
      .is("user_id", null)
      .order("display_name");
    return { chama, slots: slots ?? [] };
  });

export const claimSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await currentMember(context.supabase as Sb, context.userId);
    if (existing) throw new Error("already_member");
    const { data: row, error } = await supabaseAdmin
      .from("chama_members")
      .update({ user_id: context.userId })
      .eq("id", data.memberId)
      .is("user_id", null)
      .select("id, chama_id, display_name")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("slot_taken");
    await supabaseAdmin.from("audit_logs").insert({
      chama_id: row.chama_id,
      actor_id: context.userId,
      action: "JOIN",
      entity: "chama_members",
      entity_id: row.id,
      details: { display_name: row.display_name },
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Home screen                                                         */
/* ------------------------------------------------------------------ */

export const getHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null } as const;

    const today = new Date().toISOString().slice(0, 10);
    const [ledger, mine, loans, repayments, meeting, announcement] = await Promise.all([
      sb.from("ledger_entries").select("kind, amount").eq("chama_id", me.chama_id),
      sb
        .from("contributions")
        .select("amount, status")
        .eq("member_id", me.id)
        .eq("period", period())
        .eq("status", "confirmed"),
      sb.from("loans").select("id, amount, status").eq("member_id", me.id).eq("status", "approved"),
      sb.from("loan_repayments").select("amount, loan_id").eq("chama_id", me.chama_id),
      sb
        .from("meetings")
        .select("id, title, meet_on, meet_at, location, agenda")
        .eq("chama_id", me.chama_id)
        .gte("meet_on", today)
        .order("meet_on")
        .limit(1)
        .maybeSingle(),
      sb
        .from("announcements")
        .select("message, created_at")
        .eq("chama_id", me.chama_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const entries = (ledger.data ?? []) as { kind: "in" | "out"; amount: number }[];
    const balance =
      sum(entries.filter((e) => e.kind === "in")) - sum(entries.filter((e) => e.kind === "out"));

    const required = Number(me.chamas.monthly_contribution);
    const paid = sum((mine.data ?? []) as { amount: number }[]);

    const myLoans = (loans.data ?? []) as { id: string; amount: number }[];
    const paidPerLoan = ((repayments.data ?? []) as { amount: number; loan_id: string }[]).filter((r) =>
      myLoans.some((l) => l.id === r.loan_id),
    );
    const loanTotal = sum(myLoans);
    const loanPaid = sum(paidPerLoan);

    let myRsvp: string | null = null;
    if (meeting.data) {
      const { data: rsvp } = await sb
        .from("meeting_attendance")
        .select("response")
        .eq("meeting_id", meeting.data.id)
        .eq("member_id", me.id)
        .maybeSingle();
      myRsvp = rsvp?.response ?? null;
    }

    return {
      member: { id: me.id, name: me.display_name, role: me.role },
      chama: { id: me.chama_id, name: me.chamas.name, joinCode: me.chamas.join_code },
      balance,
      month: { required, paid, remaining: Math.max(required - paid, 0), period: period() },
      loan: { total: loanTotal, paid: loanPaid, remaining: Math.max(loanTotal - loanPaid, 0) },
      meeting: meeting.data ?? null,
      myRsvp,
      announcement: announcement.data ?? null,
    } as const;
  });

/* ------------------------------------------------------------------ */
/* Contributions + chama book                                          */
/* ------------------------------------------------------------------ */

export const getContributions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null, rows: [], mine: [] } as const;
    const { data } = await sb
      .from("contributions")
      .select("id, amount, period, status, method, paid_on, member_id, chama_members(display_name)")
      .eq("chama_id", me.chama_id)
      .order("paid_on", { ascending: false })
      .limit(120);
    const rows = (data ?? []) as any[];
    return {
      member: { id: me.id, role: me.role, name: me.display_name },
      monthly: Number(me.chamas.monthly_contribution),
      rows,
      mine: rows.filter((r) => r.member_id === me.id),
    } as const;
  });

export const recordContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amount: z.number().positive().max(1_000_000),
        memberId: z.string().uuid().optional(),
        method: z.enum(["mpesa_mock", "cash", "bank_mock"]).default("mpesa_mock"),
        kind: z.string().default("monthly"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) throw new Error("not_a_member");

    const forOther = data.memberId && data.memberId !== me.id;
    const isOfficial = (OFFICIALS as readonly string[]).includes(me.role);
    if (forOther && !isOfficial) throw new Error("not_allowed");

    // An official recording in the chama book confirms straight away.
    // A member paying for herself is written down as pending until the
    // treasurer confirms the money arrived.
    const status = isOfficial ? "confirmed" : "pending";

    const { data: row, error } = await sb
      .from("contributions")
      .insert({
        chama_id: me.chama_id,
        member_id: data.memberId ?? me.id,
        amount: data.amount,
        period: period(),
        kind: data.kind,
        method: data.method,
        status,
        recorded_by: context.userId,
        confirmed_by: status === "confirmed" ? context.userId : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (status === "confirmed") {
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "in",
        category: "michango",
        amount: data.amount,
        description: "Mchango",
        recorded_by: context.userId,
        approved_by: context.userId,
        source_table: "contributions",
        source_id: row.id,
      });
    }
    return { ok: true, status };
  });

export const confirmContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");

    const { data: row, error } = await sb
      .from("contributions")
      .update({ status: data.accept ? "confirmed" : "rejected", confirmed_by: context.userId })
      .eq("id", data.id)
      .select("id, amount")
      .single();
    if (error) throw new Error(error.message);

    if (data.accept) {
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "in",
        category: "michango",
        amount: row.amount,
        description: "Mchango umethibitishwa",
        recorded_by: context.userId,
        approved_by: context.userId,
        source_table: "contributions",
        source_id: row.id,
      });
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

export const getLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null, loans: [] } as const;
    const [{ data: loans }, { data: reps }] = await Promise.all([
      sb
        .from("loans")
        .select("id, amount, reason, status, due_date, requested_at, member_id, chama_members(display_name)")
        .eq("chama_id", me.chama_id)
        .order("requested_at", { ascending: false }),
      sb.from("loan_repayments").select("loan_id, amount, paid_on").eq("chama_id", me.chama_id),
    ]);
    const repayments = (reps ?? []) as { loan_id: string; amount: number }[];
    const withTotals = ((loans ?? []) as any[]).map((l) => {
      const paid = sum(repayments.filter((r) => r.loan_id === l.id));
      return { ...l, paid, remaining: Math.max(Number(l.amount) - paid, 0), mine: l.member_id === me.id };
    });
    return { member: { id: me.id, role: me.role }, loans: withTotals } as const;
  });

export const requestLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ amount: z.number().positive().max(1_000_000), reason: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) throw new Error("not_a_member");
    const { error } = await sb.from("loans").insert({
      chama_id: me.chama_id,
      member_id: me.id,
      amount: data.amount,
      reason: data.reason ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), dueDate: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");
    const { data: row, error } = await sb
      .from("loans")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
        due_date: data.approve ? (data.dueDate ?? null) : null,
      })
      .eq("id", data.id)
      .select("id, amount")
      .single();
    if (error) throw new Error(error.message);
    if (data.approve) {
      await sb.from("ledger_entries").insert({
        chama_id: me.chama_id,
        kind: "out",
        category: "mkopo",
        amount: row.amount,
        description: "Mkopo umetolewa",
        recorded_by: context.userId,
        approved_by: context.userId,
        source_table: "loans",
        source_id: row.id,
      });
    }
    return { ok: true };
  });

export const recordRepayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ loanId: z.string().uuid(), amount: z.number().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || !(OFFICIALS as readonly string[]).includes(me.role)) throw new Error("not_allowed");
    const { data: row, error } = await sb
      .from("loan_repayments")
      .insert({
        loan_id: data.loanId,
        chama_id: me.chama_id,
        amount: data.amount,
        recorded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("ledger_entries").insert({
      chama_id: me.chama_id,
      kind: "in",
      category: "marejesho",
      amount: data.amount,
      description: "Marejesho ya mkopo",
      recorded_by: context.userId,
      approved_by: context.userId,
      source_table: "loan_repayments",
      source_id: row.id,
    });
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Meetings                                                            */
/* ------------------------------------------------------------------ */

export const getMeetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null, meetings: [] } as const;
    const { data } = await sb
      .from("meetings")
      .select("id, title, meet_on, meet_at, location, agenda, minutes")
      .eq("chama_id", me.chama_id)
      .order("meet_on", { ascending: false })
      .limit(30);
    const { data: rsvps } = await sb
      .from("meeting_attendance")
      .select("meeting_id, member_id, response, chama_members(display_name)")
      .eq("chama_id", me.chama_id);
    return {
      member: { id: me.id, role: me.role },
      meetings: (data ?? []) as any[],
      rsvps: (rsvps ?? []) as any[],
    } as const;
  });

export const saveRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ meetingId: z.string().uuid(), response: z.enum(["coming", "not_coming"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) throw new Error("not_a_member");
    const { data: existing } = await sb
      .from("meeting_attendance")
      .select("id")
      .eq("meeting_id", data.meetingId)
      .eq("member_id", me.id)
      .maybeSingle();
    if (existing) {
      await sb
        .from("meeting_attendance")
        .update({ response: data.response, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await sb.from("meeting_attendance").insert({
        meeting_id: data.meetingId,
        member_id: me.id,
        chama_id: me.chama_id,
        response: data.response,
      });
    }
    return { ok: true };
  });

export const createMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(2).max(120),
        meetOn: z.string(),
        meetAt: z.string().default("17:00"),
        location: z.string().min(2).max(160),
        agenda: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || !["secretary", "chairperson"].includes(me.role)) throw new Error("not_allowed");
    const { error } = await sb.from("meetings").insert({
      chama_id: me.chama_id,
      title: data.title,
      meet_on: data.meetOn,
      meet_at: data.meetAt,
      location: data.location,
      agenda: data.agenda ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMinutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ meetingId: z.string().uuid(), minutes: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || !["secretary", "chairperson"].includes(me.role)) throw new Error("not_allowed");
    const { error } = await sb.from("meetings").update({ minutes: data.minutes }).eq("id", data.meetingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Money transparency + members                                        */
/* ------------------------------------------------------------------ */

export const getMoney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null, entries: [] } as const;
    const { data } = await sb
      .from("ledger_entries")
      .select("id, kind, category, amount, description, occurred_on, recorded_by, approved_by")
      .eq("chama_id", me.chama_id)
      .order("occurred_on", { ascending: false })
      .limit(100);
    const entries = ((data ?? []) as any[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    const totals = {
      in: sum(entries.filter((e) => e.kind === "in")),
      out: sum(entries.filter((e) => e.kind === "out")),
      loans: sum(entries.filter((e) => e.category === "mkopo")),
      repayments: sum(entries.filter((e) => e.category === "marejesho")),
    };
    const { data: names } = await sb.from("chama_members").select("user_id, display_name").eq("chama_id", me.chama_id);
    return {
      member: { id: me.id, role: me.role },
      entries,
      totals: { ...totals, balance: totals.in - totals.out },
      names: (names ?? []) as { user_id: string | null; display_name: string }[],
    } as const;
  });

export const getMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) return { member: null, members: [] } as const;
    const { data } = await sb
      .from("chama_members")
      .select("id, display_name, phone, role, user_id")
      .eq("chama_id", me.chama_id)
      .order("role");
    const { data: helpers } = await sb.from("trusted_helpers").select("*").eq("member_id", me.id);
    return {
      member: { id: me.id, role: me.role, name: me.display_name },
      chama: { name: me.chamas.name, joinCode: me.chamas.join_code, monthly: Number(me.chamas.monthly_contribution) },
      members: (data ?? []) as any[],
      helpers: (helpers ?? []) as any[],
    } as const;
  });

export const setTrustedHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ helperMemberId: z.string().uuid(), canRecord: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me) throw new Error("not_a_member");
    if (data.helperMemberId === me.id) throw new Error("cannot_help_self");
    // A helper may look and may write things down. A helper can never approve
    // loans, move money out, or change who owns the account.
    const { error } = await sb.from("trusted_helpers").insert({
      member_id: me.id,
      helper_member_id: data.helperMemberId,
      can_view: true,
      can_record: data.canRecord,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTrustedHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const { error } = await sb.from("trusted_helpers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, userId: context.userId };
  });

export const postAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ message: z.string().min(3).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Sb;
    const me = await currentMember(sb, context.userId);
    if (!me || me.role === "member") throw new Error("not_allowed");
    const { error } = await sb
      .from("announcements")
      .insert({ chama_id: me.chama_id, message: data.message, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
