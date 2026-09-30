import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PropertyBrowseView from "@/components/booking/PropertyBrowseView";

export default function PropertyView() {
  const { id } = useParams();
  return (
    <div>
      <Link to="/portal/listings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />All listings</Link>
      <PropertyBrowseView propertyId={id} mode="tenant" />
    </div>
  );
}