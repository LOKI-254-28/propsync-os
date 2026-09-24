import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

function parseError(err, fallback) {
  const raw = (err?.message || String(err || "")).toLowerCase();
  if (raw.includes("403") || raw.includes("permission") || raw.includes("forbidden") || raw.includes("unauthorized"))
    return "You are not authorized to perform this action.";
  if (raw.includes("required") || raw.includes("validation") || raw.includes("must be"))
    return err?.message || "Validation error — please check the form.";
  if (raw.includes("network") || raw.includes("fetch"))
    return "Network error — please check your connection and try again.";
  return fallback || "Operation failed. Please try again.";
}

export function useCrud() {
  const [submitting, setSubmitting] = useState(false);

  const run = async (fn, { success, error } = {}) => {
    if (submitting) return null;
    setSubmitting(true);
    try {
      const result = await fn();
      if (success) toast({ title: "Success", description: success });
      return result;
    } catch (err) {
      console.error("[CRUD error]", err);
      toast({ title: "Error", description: parseError(err, error), variant: "destructive" });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, run };
}