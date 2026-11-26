"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, RefreshCw, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthService } from "@/services/auth.service";

const OTP_RESEND_SECONDS = 60;
const EMPTY_OTP = ["", "", "", "", "", ""];

type Step = "sending" | "otp" | "new-password" | "done";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

function getErrorMessage(err: unknown): string {
  const e = err as {
    error?: string;
    message?: string;
    response?: { data?: { error?: string; message?: string } };
  };
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.error ||
    e?.message ||
    "Something went wrong. Please try again."
  );
}

function OtpInput({
  value,
  onChange,
  onComplete,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onComplete?: () => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, raw: string) => {
    if (!/^\d*$/.test(raw)) return;
    const next = [...value];
    next[idx] = raw.slice(-1);
    onChange(next);
    if (raw && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, i) => digits[i] ?? "");
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) refs.current[idx + 1]?.focus();
    if (e.key === "Enter") onComplete?.();
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
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoFocus={idx === 0}
          autoComplete={idx === 0 ? "one-time-code" : "off"}
          className={cn(
            "w-10 h-10 text-center text-base font-bold rounded-lg border transition-all bg-white",
            "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
            value[idx] ? "border-brand-400 bg-brand-50" : "border-border",
          )}
        />
      ))}
    </div>
  );
}

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onCompleteLogout: () => Promise<void> | void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  email,
  onCompleteLogout,
}: ChangePasswordDialogProps) {
  const [step, setStep] = useState<Step>("sending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [resendSecs, setResendSecs] = useState(0);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const sendStartedRef = useRef(false);

  const resetState = () => {
    setStep("sending");
    setLoading(false);
    setError("");
    setInfo("");
    setOtp(EMPTY_OTP);
    setResendSecs(0);
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPass(false);
    sendStartedRef.current = false;
  };

  const sendOtp = async (isResend = false) => {
    if (!email.trim()) {
      setError("No email found for this account.");
      setStep("otp");
      return;
    }

    setLoading(true);
    setError("");
    if (isResend) setInfo("");
    try {
      await AuthService.requestPasswordReset(email.trim());
      setOtp(EMPTY_OTP);
      setResendSecs(OTP_RESEND_SECONDS);
      if (isResend) setInfo("A new OTP has been sent to your email.");
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    if (sendStartedRef.current) return;
    sendStartedRef.current = true;
    void sendOtp(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once when dialog opens
  }, [open]);

  useEffect(() => {
    if (!open || resendSecs <= 0) return;
    const t = setTimeout(() => setResendSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, resendSecs]);

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await AuthService.verifyPasswordResetOtp(email.trim(), code);
      const token = res.data?.reset_token;
      if (!token) throw new Error("Verification failed. Please try again.");
      setResetToken(token);
      setNewPassword("");
      setConfirmPassword("");
      setStep("new-password");
    } catch (err) {
      setOtp(EMPTY_OTP);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword.length > 72) {
      setError("Password must not exceed 72 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await AuthService.resetPassword(resetToken, newPassword);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDone = async () => {
    onOpenChange(false);
    await onCompleteLogout();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && step === "done") {
      void onCompleteLogout();
    }
    onOpenChange(next);
  };

  const masked = maskEmail(email.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-500" />
            </div>
            Change Password
          </DialogTitle>
        </DialogHeader>

        {step === "sending" && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <span className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Sending OTP to <span className="font-semibold text-foreground">{masked}</span>…
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-foreground">{masked}</span>. It expires in 10 minutes.
            </p>

            <div className="space-y-2">
              <OtpInput
                value={otp}
                onChange={(v) => { setOtp(v); setError(""); }}
                onComplete={handleVerifyOtp}
              />
              {error && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </p>
              )}
              {info && !error && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-green-600">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> {info}
                </p>
              )}
            </div>

            <Button
              className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2"
              onClick={handleVerifyOtp}
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <> Verify OTP <ArrowRight className="w-4 h-4" /> </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Didn&apos;t get the code?{" "}
              {resendSecs > 0 ? (
                <span>Resend in {resendSecs}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendOtp(true)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline font-medium disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" /> Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {step === "new-password" && (
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Choose a new password for{" "}
              <span className="font-semibold text-foreground">{masked}</span>
            </p>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="At least 8 characters"
                  className={cn("h-10 pl-10 pr-10", error && "border-red-400")}
                  autoComplete="new-password"
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && void handleResetPassword()}
                  placeholder="Re-enter new password"
                  className={cn("h-10 pl-10", error && "border-red-400")}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </p>
              )}
            </div>

            <Button
              className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2"
              onClick={handleResetPassword}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <> Update Password <ArrowRight className="w-4 h-4" /> </>
              )}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Password updated</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your previous session has ended. Sign in again with your new password.
              </p>
            </div>
            <Button
              className="w-full h-9 bg-brand-500 hover:bg-brand-600 text-white font-semibold gap-2"
              onClick={() => void handleDone()}
            >
              Sign in with new password <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
