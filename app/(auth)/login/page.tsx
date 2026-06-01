"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Leaf, Eye, EyeOff, ArrowRight, Shield, Phone, Mail, Lock,
  RefreshCw, Check, Calendar, ChevronRight, AlertCircle, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FINANCIAL_YEARS, FY_STATUS_CONFIG, setStoredFYId, type FinancialYear } from "@/lib/fy-store";

// ── Helpers ───────────────────────────────────────────────────────────────────
type IdentifierType = "email" | "mobile" | "unknown";

function detectType(val: string): IdentifierType {
  const trimmed = val.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^[6-9]\d{9}$/.test(trimmed)) return "mobile";
  return "unknown";
}

// ── Steps ─────────────────────────────────────────────────────────────────────
type Step =
  | "identifier"
  | "email-password"
  | "mobile-choice"
  | "mobile-password"
  | "otp-input"
  | "forgot"
  | "forgot-sent"
  | "fy-select";

// ── Sub-components ────────────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, raw: string) => {
    if (!/^\d*$/.test(raw)) return;
    const next = [...value];
    next[idx] = raw.slice(-1);
    onChange(next);
    if (raw && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) refs.current[idx + 1]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-11 h-11 text-center text-lg font-bold rounded-lg border transition-all bg-white",
            "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
            value[idx] ? "border-brand-400 bg-brand-50" : "border-border",
          )}
        />
      ))}
    </div>
  );
}

function FYStatusBadge({ status }: { status: string }) {
  const c = FY_STATUS_CONFIG[status as keyof typeof FY_STATUS_CONFIG] ?? FY_STATUS_CONFIG.closed;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
      c.bg, c.color, c.border,
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full flex-shrink-0",
        c.dot,
        status === "live" && "animate-pulse",
      )} />
      {c.label}
    </span>
  );
}

function StepProgress({ step }: { step: Step }) {
  const authSteps: Step[] = ["email-password", "mobile-choice", "mobile-password", "otp-input"];
  const authDone = authSteps.includes(step) || step === "fy-select";
  const fyDone = step === "fy-select";

  if (step === "identifier" || step === "forgot" || step === "forgot-sent") return null;

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex-1 h-1 rounded-full bg-brand-500" />
      <div className={cn("flex-1 h-1 rounded-full", authDone ? "bg-brand-500" : "bg-muted")} />
      <div className={cn("flex-1 h-1 rounded-full", fyDone ? "bg-brand-500" : "bg-muted")} />
    </div>
  );
}

// ── Left branding panel ───────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] relative flex-col bg-brand-gradient overflow-hidden flex-shrink-0">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-forest-900/40 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-sage-500/20 blur-2xl" />

      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Paramverse Bio</p>
            <p className="text-white/60 text-xs font-medium">Enterprise Resource Planning</p>
          </div>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-white text-[42px] font-extrabold leading-[1.1] tracking-tight mb-4">
            Grow smarter.<br />Farm better.
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm mb-8">
            The complete ERP platform for agri-input distribution — connecting farmers,
            distributors, and field teams in one unified system.
          </p>
          <div className="space-y-3">
            {[
              "Real-time farmer registry & field surveys",
              "End-to-end procurement & sales automation",
              "Territory-wise performance analytics",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Farmers",      value: "2.4L+" },
            { label: "Districts",    value: "180+"  },
            { label: "Daily Orders", value: "3,200+" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
              <p className="text-white text-xl font-bold">{s.value}</p>
              <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step,       setStep]       = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [idError,    setIdError]    = useState("");
  const [password,   setPassword]   = useState("");
  const [pwError,    setPwError]    = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [otp,        setOtp]        = useState(["", "", "", "", "", ""]);
  const [otpError,   setOtpError]   = useState("");
  const [remember,   setRemember]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [forgotVal,  setForgotVal]  = useState("");
  const [resendSecs, setResendSecs] = useState(0);
  const [selectedFY, setSelectedFY] = useState<FinancialYear | null>(null);

  const idType = detectType(identifier);

  // pre-select live FY
  useEffect(() => {
    const live = FINANCIAL_YEARS.find((f) => f.status === "live");
    if (live) setSelectedFY(live);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const simulate = (fn: () => void, ms = 1400) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); fn(); }, ms);
  };

  const startResendTimer = () => {
    setResendSecs(30);
    const iv = setInterval(() => {
      setResendSecs((t) => {
        if (t <= 1) { clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleIdentifierNext = () => {
    if (!identifier.trim()) { setIdError("Enter your email or mobile number"); return; }
    if (idType === "unknown") {
      setIdError("Enter a valid email address or 10-digit mobile number");
      return;
    }
    setIdError("");
    setStep(idType === "email" ? "email-password" : "mobile-choice");
  };

  const handlePasswordLogin = () => {
    if (!password.trim()) { setPwError("Password is required"); return; }
    setPwError("");
    simulate(() => setStep("fy-select"));
  };

  const handleSendOtp = () => {
    simulate(() => {
      setStep("otp-input");
      startResendTimer();
    }, 1000);
  };

  const handleVerifyOtp = () => {
    if (otp.some((v) => !v)) { setOtpError("Please enter all 6 digits"); return; }
    setOtpError("");
    simulate(() => setStep("fy-select"));
  };

  const handleForgotSubmit = () => {
    if (!forgotVal.trim()) return;
    simulate(() => setStep("forgot-sent"), 1200);
  };

  const handleFYContinue = () => {
    if (!selectedFY) return;
    setStoredFYId(selectedFY.id);
    window.location.href = "/dashboard";
  };

  // ── Step renderers ─────────────────────────────────────────────────────────
  const renderContent = () => {
    /* ────── IDENTIFIER ────── */
    if (step === "identifier") return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your email or mobile number to continue</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Email or Mobile Number</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {idType === "email"  ? <Mail  className="w-4 h-4 text-brand-500" /> :
               idType === "mobile" ? <Phone className="w-4 h-4 text-brand-500" /> :
               <Mail className="w-4 h-4 text-muted-foreground" />}
            </div>
            <Input
              type="text"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setIdError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleIdentifierNext()}
              placeholder="you@company.com or 9876543210"
              className={cn("h-10 pl-10 rounded-input", idError && "border-red-400 focus-visible:ring-red-400")}
              autoFocus
            />
            {identifier && (
              <button
                type="button"
                onClick={() => { setIdentifier(""); setIdError(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {idError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {idError}
            </p>
          )}
          {identifier.length > 3 && idType !== "unknown" && (
            <p className="text-xs text-muted-foreground">
              {idType === "email"
                ? "✓ Email detected — you'll use password login"
                : "✓ Mobile detected — choose password or OTP login"}
            </p>
          )}
        </div>

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handleIdentifierNext}
        >
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );

    /* ────── EMAIL PASSWORD ────── */
    if (step === "email-password") return (
      <div className="space-y-5">
        <div>
          <button
            onClick={() => setStep("identifier")}
            className="text-xs text-brand-600 hover:underline mb-3 flex items-center gap-1 font-medium"
          >
            ← Change email
          </button>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Enter your password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Signing in as <span className="font-semibold text-foreground">{identifier}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Password</Label>
            <button
              onClick={() => { setForgotVal(identifier); setStep("forgot"); }}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
              placeholder="Enter your password"
              className={cn("h-10 pl-10 pr-10 rounded-input", pwError && "border-red-400")}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {pwError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="rem-email" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          <label htmlFor="rem-email" className="text-sm text-muted-foreground cursor-pointer select-none">
            Keep me signed in
          </label>
        </div>

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handlePasswordLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <> Sign In <ArrowRight className="w-4 h-4" /> </>
          )}
        </Button>
      </div>
    );

    /* ────── MOBILE CHOICE ────── */
    if (step === "mobile-choice") return (
      <div className="space-y-5">
        <div>
          <button
            onClick={() => setStep("identifier")}
            className="text-xs text-brand-600 hover:underline mb-3 flex items-center gap-1 font-medium"
          >
            ← Change number
          </button>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">How to sign in?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mobile <span className="font-semibold text-foreground">+91 {identifier}</span>
          </p>
        </div>

        <div className="space-y-3">
          {/* Password option */}
          <button
            onClick={() => setStep("mobile-password")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-brand-400 hover:bg-brand-50/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-200 transition-colors">
              <Lock className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Password Login</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign in with your account password</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-600 transition-colors" />
          </button>

          {/* OTP option */}
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-brand-400 hover:bg-brand-50/40 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-green-300 border-t-green-600 animate-spin" />
              ) : (
                <Shield className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">OTP Login</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading ? "Sending OTP…" : "Get a one-time password on your mobile"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-600 transition-colors" />
          </button>
        </div>
      </div>
    );

    /* ────── MOBILE PASSWORD ────── */
    if (step === "mobile-password") return (
      <div className="space-y-5">
        <div>
          <button
            onClick={() => setStep("mobile-choice")}
            className="text-xs text-brand-600 hover:underline mb-3 flex items-center gap-1 font-medium"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Enter your password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mobile <span className="font-semibold text-foreground">+91 {identifier}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Password</Label>
            <button
              onClick={() => { setForgotVal(identifier); setStep("forgot"); }}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
              placeholder="Enter your password"
              className={cn("h-10 pl-10 pr-10 rounded-input", pwError && "border-red-400")}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {pwError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="rem-mobile" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          <label htmlFor="rem-mobile" className="text-sm text-muted-foreground cursor-pointer select-none">
            Keep me signed in
          </label>
        </div>

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handlePasswordLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <> Sign In <ArrowRight className="w-4 h-4" /> </>
          )}
        </Button>

        <div className="text-center">
          <button
            className="text-xs text-brand-600 hover:underline font-medium"
            onClick={handleSendOtp}
          >
            Use OTP instead →
          </button>
        </div>
      </div>
    );

    /* ────── OTP INPUT ────── */
    if (step === "otp-input") return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Verify OTP</h2>
          <p className="text-sm text-muted-foreground mt-1">
            6-digit OTP sent to <span className="font-semibold text-foreground">+91 {identifier}</span>
          </p>
        </div>

        <OtpInput value={otp} onChange={setOtp} />

        {otpError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 justify-center">
            <AlertCircle className="w-3.5 h-3.5" /> {otpError}
          </p>
        )}

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handleVerifyOtp}
          disabled={loading || otp.some((v) => !v)}
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <> Verify & Sign In <ArrowRight className="w-4 h-4" /> </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-4 text-xs">
          {resendSecs > 0 ? (
            <span className="text-muted-foreground">
              Resend OTP in <span className="font-semibold text-foreground">{resendSecs}s</span>
            </span>
          ) : (
            <button
              className="text-brand-600 hover:underline font-medium flex items-center gap-1"
              onClick={() => { setOtp(["", "", "", "", "", ""]); handleSendOtp(); }}
            >
              <RefreshCw className="w-3 h-3" /> Resend OTP
            </button>
          )}
          <span className="text-muted-foreground">·</span>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setStep("mobile-choice")}
          >
            Change method
          </button>
        </div>
      </div>
    );

    /* ────── FORGOT PASSWORD ────── */
    if (step === "forgot") return (
      <div className="space-y-5">
        <div>
          <button
            onClick={() => setStep(idType === "email" ? "email-password" : "mobile-password")}
            className="text-xs text-brand-600 hover:underline mb-3 flex items-center gap-1 font-medium"
          >
            ← Back to login
          </button>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Reset password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your registered email or mobile to receive reset instructions
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Email or Mobile</Label>
          <Input
            type="text"
            value={forgotVal}
            onChange={(e) => setForgotVal(e.target.value)}
            placeholder="you@company.com or 9876543210"
            className="h-10 rounded-input"
            autoFocus
          />
        </div>

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handleForgotSubmit}
          disabled={loading || !forgotVal.trim()}
        >
          {loading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <> Send Reset Link <ArrowRight className="w-4 h-4" /> </>
          )}
        </Button>
      </div>
    );

    /* ────── FORGOT SENT ────── */
    if (step === "forgot-sent") return (
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          Reset instructions sent to{" "}
          <span className="font-semibold text-foreground">{forgotVal}</span>.
          <br />
          Check your email or SMS.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setStep("identifier")}
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );

    /* ────── FY SELECT ────── */
    if (step === "fy-select") return (
      <div className="space-y-5">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Select Financial Year</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the financial year you want to work in
          </p>
        </div>

        <div className="space-y-2">
          {FINANCIAL_YEARS.filter((fy) => fy.status !== "archived").map((fy) => (
            <button
              key={fy.id}
              onClick={() => setSelectedFY(fy)}
              className={cn(
                "w-full flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all text-left",
                selectedFY?.id === fy.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-border hover:border-brand-300 hover:bg-muted/30",
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                selectedFY?.id === fy.id ? "bg-brand-500" : "bg-muted",
              )}>
                {selectedFY?.id === fy.id
                  ? <Check className="w-4 h-4 text-white" />
                  : <Calendar className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{fy.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fy.start} – {fy.end}</p>
              </div>
              <FYStatusBadge status={fy.status} />
            </button>
          ))}
        </div>

        <Button
          className="w-full h-10 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn gap-2"
          onClick={handleFYContinue}
          disabled={!selectedFY}
        >
          Enter Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );

    return null;
  };

  return (
    <div className="min-h-screen flex bg-background">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] space-y-4">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-brand-700">Paramverse Bio ERP</p>
          </div>

          {/* Progress bar */}
          <StepProgress step={step} />

          {/* Card */}
          <div className="bg-white rounded-modal border border-border shadow-xl p-8">
            {renderContent()}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground">
            Protected by Paramverse Bio Security ·{" "}
            <a href="/privacy" className="hover:underline">Privacy Policy</a>{" "}
            ·{" "}
            <a href="/terms" className="hover:underline">Terms of Use</a>
          </p>
        </div>
      </div>
    </div>
  );
}
