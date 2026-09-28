import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Home, LogIn, UserPlus, AlertCircle, KeyRound } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function AcceptInvite() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("checking"); // checking | unauthed | accepting | error
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = (params.get("code") || "").toUpperCase();
    setCode(c);
    if (!c) { setStatus("error"); setError("No invite code was provided."); return; }
    (async () => {
      try {
        const authed = await base44.auth.isAuthenticated();
        if (!authed) { setStatus("unauthed"); return; }
        setStatus("accepting");
        await base44.functions.invoke("unitInvite", { action: "accept", invite_code: c });
        try { await base44.auth.updateMe({ account_type: "client", approval_status: "approved" }); } catch (e) {}
        window.location.href = "/portal";
      } catch (e) {
        setStatus("error");
        setError(e.data?.error || e.message || "Could not accept this invite.");
      }
    })();
  }, []);

  if (status === "checking" || status === "accepting") {
    return (
      <AuthLayout icon={KeyRound} title="Accepting your invitation" subtitle="One moment…">
        <div className="flex flex-col items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-muted-foreground">{status === "accepting" ? "Linking you to your unit…" : "Checking your invitation…"}</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === "unauthed") {
    const loginTo = `/login?returnTo=${encodeURIComponent(`/accept-invite?code=${code}`)}`;
    const registerTo = `/register?invite=${encodeURIComponent(code)}`;
    return (
      <AuthLayout icon={Home} title="You're invited to a unit" subtitle="Log in or create an account to accept your invitation.">
        <div className="space-y-3">
          <Button className="w-full h-12 font-medium" asChild>
            <a href={loginTo}><LogIn className="w-4 h-4 mr-2" />Log in to accept</a>
          </Button>
          <Button variant="outline" className="w-full h-12 font-medium" asChild>
            <a href={registerTo}><UserPlus className="w-4 h-4 mr-2" />Create an account</a>
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">Invite code: <span className="font-mono">{code}</span></p>
        </div>
      </AuthLayout>
    );
  }

  // error
  return (
    <AuthLayout icon={AlertCircle} title="Couldn't accept invite" subtitle={error}>
      <div className="space-y-3">
        <Button className="w-full h-12 font-medium" asChild>
          <Link to="/portal"><Home className="w-4 h-4 mr-2" />Go to portal</Link>
        </Button>
        <Button variant="outline" className="w-full h-12 font-medium" asChild>
          <Link to="/login">Back to login</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}