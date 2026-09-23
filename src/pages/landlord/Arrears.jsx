import React, { useState, useMemo } from "react";
import { usePortfolioData } from "@/lib/useAppData";
import { base44 } from "@/api/base44Client";
import { KES, daysBetween, todayISO, genRef, logAudit, notify } from "@/lib/finance";
import { PageHeader, SectionCard, StatusBadge, EmptyState, StatCard, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Send, Clock } from "lucide-react";

function classify(charge) {
  const days = daysBetween(charge.due_date, todayISO());
  if (days <= 0) return "Current";
  if (days <= 7) return "Overdue";
  if (days <= 30) return "Arrears";
  return "Serious Arrears";
}

export default function Arrears() {
  const data = usePortfolioData();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [noticeContent, setNoticeContent] = useState("");
  const [busy, setBusy] = useState(false);

  const arrearsCharges = useMemo(() => data.charges
    .filter((c) => c.status !== "Void" && c.status !== "Paid" && Number(c.outstanding || 0) > 0 && c.due_date && new Date(c.due_date) < new Date())
    .map((c) => ({ ...c, daysOverdue: daysBetween(c.due_date, todayISO()), classification: classify(c) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue), [data.charges]);

  // Group by tenant
  const byTenant = useMemo(() => {
    const map = {};
    for (const c of arrearsCharges) {
      if (!map[c.tenant_id]) {
        const tenant = data.tenants.find((t) => t.id === c.tenant_id);
        const payments = data.payments.filter((p) => p.tenant_id === c.tenant_id && p.status === "Successful").sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
        map[c.tenant_id] = {
          tenant_id: c.tenant_id, tenant_name: c.tenant_name, tenant_user_id: c.tenant_user_id,
          charges: [], total: 0, worstClass: "Current", lastPayment: payments[0], notices: data.notices.filter((n) => n.tenant_id === c.tenant_id),
        };
      }
      map[c.tenant_id].charges.push(c);
      map[c.tenant_id].total += Number(c.outstanding || 0);
      const order = { "Current": 0, "Overdue": 1, "Arrears": 2, "Serious Arrears": 3 };
      if (order[c.classification] > order[map[c.tenant_id].worstClass]) map[c.tenant_id].worstClass = c.classification;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [arrearsCharges, data.tenants, data.payments, data.notices]);

  const totals = {
    totalArrears: byTenant.reduce((s, t) => s + t.total, 0),
    accounts: byTenant.length,
    serious: byTenant.filter((t) => t.worstClass === "Serious Arrears").length,
    overdueCharges: arrearsCharges.length,
  };

  const issueNotice = async () => {
    if (!target || !noticeContent) return;
    setBusy(true);
    const me = await base44.auth.me();
    const ref = genRef("NOT");
    const notice = await base44.entities.Notice.create({
      notice_reference: ref, type: "Arrears Notice", date_issued: todayISO(), sender: me?.email || "Landlord",
      property_id: target.charges[0]?.property_id, property_name: target.charges[0]?.property_name,
      unit_id: target.charges[0]?.unit_id, unit_number: target.charges[0]?.unit_number,
      tenant_id: target.tenant_id, tenant_user_id: target.tenant_user_id, tenant_name: target.tenant_name,
      tenancy_id: target.charges[0]?.tenancy_id,
      subject: `Arrears Notice — Outstanding ${KES(target.total)}`,
      content: noticeContent, status: "Issued", channel: "In-app", acknowledged: false,
    });
    await logAudit({ user: me, action: "Arrears Notice Issued", entity: "Notice", entity_id: notice.id, entity_name: ref });
    if (target.tenant_user_id) await notify({ recipient_user_id: target.tenant_user_id, type: "Arrears", title: "Arrears Notice Issued", message: `An arrears notice for ${KES(target.total)} has been issued.`, related_entity: "Notice", related_id: notice.id, action_link: "/portal/notices" });
    setBusy(false);
    setNoticeOpen(false);
    setNoticeContent("");
    data.reload();
  };

  const openNotice = (t) => { setTarget(t); setNoticeContent(`This is a formal notice regarding outstanding rent of ${KES(t.total)} on your account. Please arrange payment within 7 days to avoid further action.`); setNoticeOpen(true); };

  if (data.loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;

  return (
    <div>
      <PageHeader title="Arrears Dashboard" description="Outstanding rent, calculated live from the ledger. Historical arrears are preserved even after payment." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Arrears" value={KES(totals.totalArrears)} icon={AlertTriangle} accent="rose" />
        <StatCard label="Accounts in Arrears" value={totals.accounts} icon={Clock} accent="gold" />
        <StatCard label="Serious Arrears" value={totals.serious} icon={AlertTriangle} accent="rose" />
        <StatCard label="Overdue Charges" value={totals.overdueCharges} icon={Clock} accent="gold" />
      </div>

      {byTenant.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No arrears — all accounts current" description="Outstanding charges past their due date will appear here." />
      ) : (
        <div className="space-y-4">
          {byTenant.map((t) => (
            <SectionCard key={t.tenant_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold text-slate-900">{t.tenant_name}</p><StatusBadge status={t.worstClass} /></div>
                  <p className="text-xs text-slate-500">{t.charges.length} overdue charge(s) · Last payment: {t.lastPayment ? `${KES(t.lastPayment.amount)} on ${t.lastPayment.payment_date}` : "None"} · {t.notices.length} notice(s) issued</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><p className="text-xs text-slate-500">Outstanding</p><p className="text-lg font-bold text-rose-600">{KES(t.total)}</p></div>
                  <Button size="sm" variant="outline" onClick={() => openNotice(t)} className="border-rose-200 text-rose-700 hover:bg-rose-50"><Send className="mr-1.5 h-3.5 w-3.5" />Issue Notice</Button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100 text-left text-slate-500"><th className="pb-1.5 font-medium">Period</th><th className="pb-1.5 font-medium">Unit</th><th className="pb-1.5 font-medium">Due</th><th className="pb-1.5 text-right font-medium">Days Overdue</th><th className="pb-1.5 text-right font-medium">Outstanding</th></tr></thead>
                  <tbody>
                    {t.charges.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-700">{c.billing_period}</td><td className="py-1.5 text-slate-600">{c.unit_number}</td><td className="py-1.5 text-slate-600">{c.due_date}</td>
                        <td className="py-1.5 text-right text-rose-600">{c.daysOverdue}d</td><td className="py-1.5 text-right font-medium text-slate-900">{KES(c.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue Arrears Notice</DialogTitle></DialogHeader>
          {target && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-slate-800">{target.tenant_name}</p><p className="text-rose-600">Outstanding: {KES(target.total)}</p></div>
              <Field label="Notice content"><Textarea value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} rows={5} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={issueNotice} disabled={busy} className="bg-rose-600 hover:bg-rose-700">{busy ? "Issuing..." : "Issue Notice"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}