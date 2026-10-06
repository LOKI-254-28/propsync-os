import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { UserPlus, Mail, Loader2, Building2, Home, User, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { genRef, todayISO } from "@/lib/finance";

export default function Register() {
  const [step, setStep] = useState("role"); // 'role' | 'form' | 'otp'
  const [accountType, setAccountType] = useState(""); // 'landowner' | 'client'
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setTimeout(() => setResendCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);
  const [listingId, setListingId] = useState("");
  const [returnTo, setReturnTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setListingId(params.get("listing") || "");
    setReturnTo(params.get("returnTo") || "");
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      const me = await base44.auth.me();
      await base44.auth.updateMe({
        full_name: fullName,
        account_type: accountType,
        approval_status: accountType === "client" ? "approved" : "pending",
      });
      if (accountType === "client") {
        if (listingId) {
          const l = await base44.entities.Listing.get(listingId);
          window.location.href = returnTo || `/portal/property/${l.property_id}?unit=${l.unit_id || ''}`;
        } else {
          window.location.href = "/portal";
        }
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown || resending) return;
    setError(""); setResending(true);
    try {
      await base44.auth.resendOtp(email);
      setOtpCode(""); setResendCooldown(60);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    } finally { setResending(false); }
  };

  const handleGoogle = () => base44.auth.loginWithProvider("google", safeReturnTo());

  // Step 3: OTP
  if (step === "otp") {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify & Continue"}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} disabled={loading || resending || resendCooldown > 0} className="text-primary font-medium hover:underline disabled:opacity-50">{resending ? 'Sending…' : resendCooldown ? `Resend in ${resendCooldown}s` : 'Resend email code'}</button>
        </p>
      </AuthLayout>
    );
  }

  // Step 1: Account type
  if (step === "role") {
    return (
      <AuthLayout icon={UserPlus} title="Create your account" subtitle="Are you a landlord or a tenant?"
        footer={<>Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setAccountType("landowner"); setStep("form"); }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-6 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <span className="text-sm font-semibold text-foreground">Landlord</span>
              <span className="text-[10px] text-muted-foreground text-center">Manage rental properties</span>
            </button>
            <button onClick={() => { setAccountType("client"); setStep("form"); }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-6 transition-colors hover:border-amber-300 hover:bg-amber-50/30">
              <Home className="h-8 w-8 text-amber-600" />
              <span className="text-sm font-semibold text-foreground">Tenant</span>
              <span className="text-[10px] text-muted-foreground text-center">Rent a property</span>
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Step 2: Form
  return (
    <AuthLayout icon={accountType === "landowner" ? Building2 : Home} title={accountType === "landowner" ? "Landowner Account" : "Tenant Account"} subtitle="Fill in your details to create your account"
      footer={<>
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
      </>}>
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-4" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" />Continue with Google
      </Button>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">or</span></div></div>

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="name" autoFocus placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm</Label>
            <PasswordInput id="confirm" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create account"}
        </Button>
        <button type="button" onClick={() => { setStep("role"); setAccountType(""); setError(""); }} className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />Back to account type
        </button>
      </form>
    </AuthLayout>
  );
}