import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { KES, genRef, logAudit, notify, todayISO } from "@/lib/finance";
import { PageHeader, StatusBadge, EmptyState, Field } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Bed, Bath, Maximize, MapPin, Tag, Loader2, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [property, setProperty] = useState(null);
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ proposed_start_date: todayISO(), message: "", monthly_income: 0, occupation: "", id_number: "" });

  useEffect(() => {
    (async () => {
      try {
        const l = await base44.entities.Listing.get(id);
        setListing(l);
        if (l.property_id) {
          try { setProperty(await base44.entities.Property.get(l.property_id)); } catch (e) {}
        }
        if (l.unit_id) {
          try { setUnit(await base44.entities.Unit.get(l.unit_id)); } catch (e) {}
        }
      } catch (e) {
        toast({ title: "Error", description: "Could not load listing.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const applyLabel = "Apply to Rent";
  const appType = "rental";

  const submit = async () => {
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      const tenant = await base44.entities.Tenant.filter({ user_id: me.id }).then((r) => r[0]);
      const ref = genRef("APP");
      const rec = await base44.entities.Application.create({
        application_reference: ref, tenant_user_id: me.id, tenant_id: tenant?.id || "",
        applicant_name: tenant?.full_name || me.full_name || me.email,
        applicant_email: tenant?.email || me.email, applicant_phone: tenant?.phone || "",
        id_number: form.id_number || tenant?.id_number || "", occupation: form.occupation || tenant?.occupation || "",
        monthly_income: Number(form.monthly_income) || tenant?.monthly_income || 0,
        property_id: listing.property_id, property_name: listing.property_name,
        unit_id: listing.unit_id || "", unit_number: listing.unit_number || "",
        monthly_rent: listing.price, proposed_start_date: form.proposed_start_date,
        message: form.message, status: "Submitted", submitted_date: todayISO(),
        application_type: appType, listing_id: listing.id, owner_user_id: listing.owner_user_id || "",
      });
      await logAudit({ user: me, action: "Application Submitted", entity: "Application", entity_id: rec.id, entity_name: ref });
      if (listing.owner_user_id) await notify({ recipient_user_id: listing.owner_user_id, type: "Application", title: "New Application", message: `New ${appType} application for ${listing.property_name} ${listing.unit_number || ""}.`, related_entity: "Application", related_id: rec.id, action_link: "/applications" });
      toast({ title: "Success", description: "Application submitted successfully." });
      setApplyOpen(false);
      navigate("/portal/applications");
    } catch (err) {
      console.error("[Apply error]", err);
      toast({ title: "Error", description: "Could not submit application. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" /></div>;
  if (!listing) return <EmptyState icon={Tag} title="Listing not found" action={<Link to="/portal/listings" className="text-emerald-700 hover:underline">Back to listings</Link>} />;

  return (
    <div>
      <Link to="/portal/listings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />All listings</Link>
      <PageHeader title={listing.property_name} description={listing.unit_number ? `Unit ${listing.unit_number}` : listing.listing_type}
        actions={<div className="flex items-center gap-2"><StatusBadge status={listing.listing_type} /><StatusBadge status={listing.status} /></div>} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50">
              {listing.images?.[0] ? <img src={listing.images[0]} alt={listing.property_name} className="h-full w-full object-cover" /> : <Tag className="h-16 w-16 text-emerald-300" />}
            </div>
          </div>
          {listing.description && <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">{listing.description}</div>}
          {unit && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-medium text-slate-800">Unit Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {unit.bedrooms > 0 && <Detail icon={Bed} label="Bedrooms" value={unit.bedrooms} />}
                {unit.bathrooms > 0 && <Detail icon={Bath} label="Bathrooms" value={unit.bathrooms} />}
                {unit.size_sqm > 0 && <Detail icon={Maximize} label="Size" value={`${unit.size_sqm}m²`} />}
                <Detail icon={Tag} label="Type" value={unit.unit_type} />
              </div>
              {unit.amenities?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium uppercase text-slate-500">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">{unit.amenities.map((a) => <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{a}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold text-emerald-700">{KES(listing.price)}{listing.listing_type === "Rent" && <span className="text-sm font-normal text-slate-500">/month</span>}</p>
            <div className="mt-3 space-y-2 text-sm">
              {property?.address && <p className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400" />{property.address}</p>}
              <p className="flex items-center gap-2 text-slate-600"><Tag className="h-4 w-4 text-slate-400" />{listing.listing_type}</p>
              {listing.date_listed && <p className="text-xs text-slate-400">Listed {listing.date_listed}</p>}
            </div>
            <Button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/portal/property/${listing.property_id}?unit=${listing.unit_id || ""}`)}>
              <Check className="mr-1.5 h-4 w-4" />View property & select unit
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{applyLabel}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{listing.property_name} {listing.unit_number && `· ${listing.unit_number}`}</p>
              <p className="text-emerald-700 font-semibold">{KES(listing.price)}{listing.listing_type === "Rent" && "/month"}</p>
            </div>
            <Field label="ID number"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
            <Field label="Monthly income"><Input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} /></Field>
            <Field label="Proposed start date"><Input type="date" value={form.proposed_start_date} onChange={(e) => setForm({ ...form, proposed_start_date: e.target.value })} /></Field>
            <Field label="Message to provider"><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} /></Field>
          </div>
          <DialogFooter><Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">{submitting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Submitting...</> : "Submit Application"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">{label}</p><p className="font-medium text-slate-800">{value}</p></div></div>;
}