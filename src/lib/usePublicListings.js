import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Fetches published listings, active properties, and available units for public browsing.
// RLS allows public reads: Listing (Published), Unit (Available), Property (Active).
export function usePublicListings() {
  const [listings, setListings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, p, u] = await Promise.all([
          base44.entities.Listing.list("-created_date", 200),
          base44.entities.Property.list("-created_date", 200),
          base44.entities.Unit.list("-created_date", 200),
        ]);
        setListings(l || []);
        setProperties(p || []);
        setUnits(u || []);
      } catch (e) {
        // public RLS reads; ignore failures
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { listings, properties, units, loading };
}