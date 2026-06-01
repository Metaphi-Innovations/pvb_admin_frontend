"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, ArrowRight, Shield, Phone, Mail, Lock,
  RefreshCw, Check, Calendar, ChevronRight, AlertCircle,
  X, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// ── Shared sub-components ─────────────────────────────────────────────────────
function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-500">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {msg}
    </p>
  );
}

function OtpRow({ filled = 0, error = false }: { filled?: number; error?: boolean }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all",
            error ? "border-red-400 bg-red-50"
              : i < filled ? "border-brand-400 bg-brand-50 text-brand-700"
              : i === filled ? "border-brand-400 ring-2 ring-brand-200"
              : "border-border",
          )}
        >
          {i < filled ? "•" : ""}
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {badge && (
          <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 bg-white">{children}</div>
    </div>
  );
}

// ── State 1: Identifier Input ─────────────────────────────────────────────────
function State_Identifier() {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  const idType = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) ? "email"
    : /^[6-9]\d{9}$/.test(val.trim()) ? "mobile" : "unknown";

  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Welcome back</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Enter your email or mobile number</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Email or Mobile Number</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {idType === "email"  ? <Mail  className="w-4 h-4 text-brand-500" /> :
             idType === "mobile" ? <Phone className="w-4 h-4 text-brand-500" /> :
             <Mail className="w-4 h-4 text-muted-foreground" />}
          </div>
          <Input
            value={val}
            onChange={(e) => { setVal(e.target.value); setError(""); }}
            placeholder="you@company.com or 9876543210"
            className={cn("h-9 pl-10 text-xs rounded-input", error && "border-red-400")}
          />
          {val && (
            <button onClick={() => setVal("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {error && <ErrorMsg msg={error} />}
        {val.length > 3 && idType !== "unknown" && (
          <p className="text-[11px] text-muted-foreground">
            {idType === "email" ? "✓ Email — password login" : "✓ Mobile — password or OTP"}
          </p>
        )}
      </div>
      <Button
        className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2 rounded-btn"
        onClick={() => { if (!val.trim()) setError("Enter your email or mobile number"); }}
      >
        Continue <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── State 2: Email + Password ─────────────────────────────────────────────────
function State_EmailPassword() {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <button className="text-xs text-brand-600 hover:underline mb-2">← Change email</button>
        <h3 className="text-sm font-semibold text-foreground">Enter your password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Signing in as <span className="font-medium text-foreground">admin@dharitrisutra.com</span></p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Password</Label>
          <button className="text-[11px] text-brand-600 hover:underline font-medium">Forgot password?</button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            placeholder="Enter your password"
            className={cn("h-9 pl-10 pr-9 text-xs rounded-input", err && "border-red-400")}
          />
          <button onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {err && <ErrorMsg msg={err} />}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="rem1" />
        <label htmlFor="rem1" className="text-xs text-muted-foreground cursor-pointer">Keep me signed in</label>
      </div>
      <Button
        className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2 rounded-btn"
        onClick={() => { if (!pw) setErr("Password is required"); }}
      >
        Sign In <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── State 3: Mobile → Choice ──────────────────────────────────────────────────
function State_MobileChoice() {
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <button className="text-xs text-brand-600 hover:underline mb-2">← Change number</button>
        <h3 className="text-sm font-semibold text-foreground">How to sign in?</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Mobile <span className="font-medium text-foreground">+91 9876543210</span></p>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-border hover:border-brand-400 hover:bg-brand-50/30 transition-all cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Password Login</p>
            <p className="text-[11px] text-muted-foreground">Sign in with your password</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-border hover:border-brand-400 hover:bg-brand-50/30 transition-all cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">OTP Login</p>
            <p className="text-[11px] text-muted-foreground">One-time password on mobile</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ── State 4: OTP Verification ─────────────────────────────────────────────────
function State_OTPVerify() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };
  return (
    <div className="space-y-4 max-w-xs">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-brand-500" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Verify OTP</h3>
        <p className="text-xs text-muted-foreground mt-1">OTP sent to <span className="font-medium">+91 9876543210</span></p>
      </div>
      <div className="flex gap-1.5 justify-center">
        {Array.from({ length: 6 }).map((_, idx) => (
          <input
            key={idx}
            ref={(el) => { refs.current[idx] = el; }}
            type="text" inputMode="numeric" maxLength={1}
            value={otp[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus(); }}
            className={cn(
              "w-10 h-10 text-center text-base font-bold rounded-lg border transition-all bg-white focus:outline-none focus:ring-2 focus:ring-brand-400",
              otp[idx] ? "border-brand-400 bg-brand-50" : "border-border",
            )}
          />
        ))}
      </div>
      <Button className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2 rounded-btn" disabled={otp.some((v) => !v)}>
        Verify & Sign In <ArrowRight className="w-3.5 h-3.5" />
      </Button>
      <div className="flex items-center justify-center gap-4 text-xs">
        <button className="text-brand-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Resend OTP
        </button>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Resend in <span className="font-semibold">28s</span></span>
      </div>
    </div>
  );
}

// ── State 5: Forgot Password ──────────────────────────────────────────────────
function State_ForgotPassword() {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <button className="text-xs text-brand-600 hover:underline mb-2">← Back to login</button>
        <h3 className="text-sm font-semibold text-foreground">Reset password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Enter your email or mobile for reset instructions</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Email or Mobile</Label>
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="you@company.com or 9876543210"
          className="h-9 text-xs rounded-input"
        />
      </div>
      <Button className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2 rounded-btn" disabled={!val.trim()}>
        Send Reset Link <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── State 6: Forgot Sent ──────────────────────────────────────────────────────
function State_ForgotSent() {
  return (
    <div className="space-y-3 max-w-xs text-center">
      <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-3">
        <Check className="w-6 h-6 text-green-500" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">Check your inbox</h3>
      <p className="text-xs text-muted-foreground">
        Instructions sent to <span className="font-semibold text-foreground">admin@dharitrisutra.com</span>.<br />
        Check your email or SMS.
      </p>
      <button className="text-xs text-brand-600 hover:underline font-medium">← Back to sign in</button>
    </div>
  );
}

// ── State 7: Loading ──────────────────────────────────────────────────────────
function State_Loading() {
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Enter your password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Signing in as <span className="font-medium">admin@dharitrisutra.com</span></p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Password</Label>
        <Input type="password" value="••••••••" readOnly className="h-9 text-xs rounded-input opacity-60" />
      </div>
      <Button className="w-full h-9 bg-brand-500 text-white text-xs font-semibold rounded-btn" disabled>
        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
        Verifying…
      </Button>
    </div>
  );
}

// ── State 8: Validation Errors ────────────────────────────────────────────────
function State_ValidationErrors() {
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Enter your password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Signing in as <span className="font-medium">admin@dharitrisutra.com</span></p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Password</Label>
        <Input type="password" className="h-9 text-xs rounded-input border-red-400 focus-visible:ring-red-300" placeholder="" />
        <ErrorMsg msg="Password is required" />
      </div>
      <Button className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-btn" disabled>
        Sign In <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── State 9: Disabled (read-only preview) ─────────────────────────────────────
function State_Disabled() {
  return (
    <div className="space-y-4 max-w-xs opacity-60 pointer-events-none select-none">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Enter your password</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Account locked — contact administrator</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Password</Label>
        <Input type="password" disabled placeholder="Account locked" className="h-9 text-xs rounded-input bg-muted" />
      </div>
      <Button className="w-full h-9 text-xs font-semibold rounded-btn" disabled>
        Sign In
      </Button>
    </div>
  );
}

// ── FY Selection Step (mini) ──────────────────────────────────────────────────
function State_FYSelect() {
  const [sel, setSel] = useState("2024-25");
  const fys = [
    { id: "2023-24", label: "FY 2023-24", status: "closed",   range: "Apr 2023 – Mar 2024" },
    { id: "2024-25", label: "FY 2024-25", status: "live",     range: "Apr 2024 – Mar 2025" },
    { id: "2025-26", label: "FY 2025-26", status: "upcoming", range: "Apr 2025 – Mar 2026" },
  ];
  const badgeMap: Record<string, string> = {
    live: "text-green-700 bg-green-50 border-green-200",
    upcoming: "text-blue-700 bg-blue-50 border-blue-200",
    closed: "text-slate-600 bg-slate-100 border-slate-200",
  };
  const dotMap: Record<string, string> = { live: "bg-green-500 animate-pulse", upcoming: "bg-blue-500", closed: "bg-slate-400" };
  return (
    <div className="space-y-4 max-w-xs">
      <div>
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-3">
          <Calendar className="w-5 h-5 text-brand-500" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Select Financial Year</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Choose the year to work in</p>
      </div>
      <div className="space-y-1.5">
        {fys.map((fy) => (
          <button
            key={fy.id}
            onClick={() => setSel(fy.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
              sel === fy.id ? "border-brand-500 bg-brand-50" : "border-border hover:border-brand-300",
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              sel === fy.id ? "bg-brand-500" : "bg-muted",
            )}>
              {sel === fy.id ? <Check className="w-4 h-4 text-white" /> : <Calendar className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">{fy.label}</p>
              <p className="text-[10px] text-muted-foreground">{fy.range}</p>
            </div>
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0", badgeMap[fy.status])}>
              <span className={cn("w-1 h-1 rounded-full", dotMap[fy.status])} />
              {fy.status.charAt(0).toUpperCase() + fy.status.slice(1)}
            </span>
          </button>
        ))}
      </div>
      <Button className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold gap-2 rounded-btn">
        Enter Dashboard →
      </Button>
    </div>
  );
}

// ── Full Login Shell Preview ──────────────────────────────────────────────────
function FullLoginPreview() {
  return (
    <div className="border border-border rounded-xl overflow-hidden" style={{ height: 320 }}>
      <div className="flex h-full">
        {/* Mini left panel */}
        <div className="w-40 bg-brand-gradient flex-shrink-0 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative z-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-3">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-bold text-xs leading-tight">Dharitri Sutra</p>
            <p className="text-white/60 text-[10px] mt-0.5">Enterprise ERP</p>
            <div className="mt-4 space-y-2">
              {["2.4L+ Farmers", "180+ Districts", "3,200+ Orders"].map((s) => (
                <div key={s} className="bg-white/10 rounded-lg px-2 py-1">
                  <p className="text-white/80 text-[10px] font-medium">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="w-full max-w-[220px] space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Welcome back</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sign in to continue</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-foreground">Email or Mobile</p>
              <div className="h-8 rounded-lg border border-border bg-white px-2.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">you@company.com</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-brand-500 flex items-center justify-center gap-1.5">
              <span className="text-white text-[11px] font-semibold">Continue</span>
              <ArrowRight className="w-3 h-3 text-white" />
            </div>
            <p className="text-[10px] text-center text-muted-foreground">Protected by Dharitri Sutra Security</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────
export default function LoginSection() {
  const states = [
    { id: "identifier",   label: "Identifier Input",    badge: "Step 1",    Component: State_Identifier },
    { id: "email-pw",     label: "Email + Password",    badge: "Step 2A",   Component: State_EmailPassword },
    { id: "mobile",       label: "Mobile — Login Choice", badge: "Step 2B", Component: State_MobileChoice },
    { id: "otp",          label: "OTP Verification",    badge: "Step 2C",   Component: State_OTPVerify },
    { id: "forgot",       label: "Forgot Password",     badge: "Flow",      Component: State_ForgotPassword },
    { id: "forgot-sent",  label: "Reset Link Sent",     badge: "Flow",      Component: State_ForgotSent },
    { id: "fy",           label: "FY Selection",        badge: "Step 3",    Component: State_FYSelect },
    { id: "loading",      label: "Loading State",       badge: "State",     Component: State_Loading },
    { id: "validation",   label: "Validation Errors",   badge: "State",     Component: State_ValidationErrors },
    { id: "disabled",     label: "Disabled / Locked",   badge: "State",     Component: State_Disabled },
  ];

  return (
    <div className="space-y-10">

      {/* ── Full login shell preview ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Login Shell — Full Preview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Two-panel layout: gradient left panel (branding/stats) + right form panel (steps)
          </p>
        </div>
        <FullLoginPreview />
      </section>

      {/* ── Login flow steps ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Login Flow States</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All interactive states — identifier detection, email/mobile flows, OTP, forgot password, FY selection
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {states.map(({ id, label, badge, Component }) => (
            <SectionCard key={id} label={label} badge={badge}>
              <Component />
            </SectionCard>
          ))}
        </div>
      </section>

      {/* ── Step flow diagram ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Login Flow Diagram</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Decision tree for the smart identifier-based login flow</p>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white">
          <div className="flex flex-col items-center gap-0 text-xs font-medium">
            {/* Step 1 */}
            <div className="flex items-center justify-center w-52 py-2.5 px-4 rounded-xl bg-brand-500 text-white text-center font-semibold shadow-sm">
              Enter Email or Mobile
            </div>
            <div className="w-px h-4 bg-muted-foreground/30" />
            <div className="text-[10px] text-muted-foreground font-normal">Auto-detect type</div>
            <div className="w-px h-4 bg-muted-foreground/30" />

            {/* Branch */}
            <div className="flex items-start gap-16">
              <div className="flex flex-col items-center gap-0">
                <div className="w-px h-4 bg-muted-foreground/30" />
                <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">Email</div>
                <div className="w-px h-4 bg-muted-foreground/30" />
                <div className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-[11px]">Password</div>
                <div className="w-px h-4 bg-muted-foreground/30" />
                <div className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-[11px]">Sign In</div>
              </div>

              <div className="flex flex-col items-center gap-0">
                <div className="w-px h-4 bg-muted-foreground/30" />
                <div className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">Mobile</div>
                <div className="w-px h-4 bg-muted-foreground/30" />
                {/* Mobile sub-branch */}
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-px h-3 bg-muted-foreground/30" />
                    <div className="px-2 py-1 rounded-lg bg-muted border border-border text-[10px]">Password</div>
                    <div className="w-px h-2 bg-muted-foreground/30" />
                    <div className="px-2 py-1 rounded-lg bg-muted border border-border text-[10px]">Sign In</div>
                  </div>
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-px h-3 bg-muted-foreground/30" />
                    <div className="px-2 py-1 rounded-lg bg-muted border border-border text-[10px]">Send OTP</div>
                    <div className="w-px h-2 bg-muted-foreground/30" />
                    <div className="px-2 py-1 rounded-lg bg-muted border border-border text-[10px]">Verify OTP</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-px h-4 bg-muted-foreground/30 mt-2" />
            <div className="text-[10px] text-muted-foreground font-normal">Both flows converge</div>
            <div className="w-px h-4 bg-muted-foreground/30" />

            {/* FY Select */}
            <div className="flex items-center justify-center w-52 py-2.5 px-4 rounded-xl bg-brand-100 text-brand-700 text-center font-semibold border border-brand-200">
              Select Financial Year
            </div>
            <div className="w-px h-4 bg-muted-foreground/30" />
            <div className="flex items-center justify-center w-52 py-2.5 px-4 rounded-xl bg-green-50 text-green-700 text-center font-semibold border border-green-200">
              ✓ Dashboard
            </div>
          </div>
        </div>
      </section>

      {/* ── Validation rules ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Validation Rules</h2>
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Field", "Rule", "Error Message", "Regex / Logic"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Identifier",  "Required",               "Enter your email or mobile number",         "val.trim().length > 0"],
                ["Email",       "Valid email format",      "Enter a valid email address",               "/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"],
                ["Mobile",      "Indian 10-digit mobile", "Enter a valid 10-digit mobile number",      "/^[6-9]\\d{9}$/"],
                ["Password",    "Required, non-empty",     "Password is required",                      "val.trim().length > 0"],
                ["OTP",         "6 digits, all filled",   "Please enter all 6 digits",                 "otp.every(v => v !== '')"],
                ["Forgot input","Required, non-empty",     "Enter your email or mobile",                "val.trim().length > 0"],
              ].map(([field, rule, msg, regex]) => (
                <tr key={field} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground">{field}</td>
                  <td className="px-4 py-2 text-muted-foreground">{rule}</td>
                  <td className="px-4 py-2 text-red-600">{msg}</td>
                  <td className="px-4 py-2 font-mono text-[10px] text-brand-700">{regex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
