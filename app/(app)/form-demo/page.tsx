"use client";

import React, { useState } from "react";
import { AppLayout, PageShell, TwoColumnLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  TextField, PasswordField, MobileField, AmountField, PercentField,
  GSTField, HSNField, TextareaField, SelectField, GPSField,
  FileUploadField, ImageUploadField, FormSection, OTPField, Field,
} from "@/components/ui/FormFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BtnLoader } from "@/components/ui/Loaders";
import { UserPlus, Settings, AlertTriangle, CheckCircle2 } from "lucide-react";

// ── Multi-step wizard state ────────────────────────────────────────────────────
const STEPS = ["Basic Info", "Business Details", "Location & Territory", "Review"];

function WizardSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                i < current  ? "bg-brand-500 border-brand-500 text-white"
                : i === current ? "bg-white border-brand-500 text-brand-600"
                : "bg-white border-border text-muted-foreground",
              ].join(" ")}
            >
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${i <= current ? "text-brand-600" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < current ? "bg-brand-400" : "bg-border"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function FormDemoPage() {
  const [step,         setStep]         = useState(0);
  const [showDelete,   setShowDelete]   = useState(false);
  const [showApprove,  setShowApprove]  = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 2000);
  };

  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title="Add Distributor"
          description="Register a new distributor in the network"
          icon={UserPlus}
          breadcrumbs={[
            { label: "Home",         href: "/dashboard"          },
            { label: "Masters",      href: "/masters"            },
            { label: "Distributors", href: "/listing-demo"       },
            { label: "Add New" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Discard</Button>
              <Button
                size="sm"
                className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <BtnLoader /> : null}
                Save Distributor
              </Button>
            </div>
          }
        />

        {/* ── Form mode tabs ── */}
        <Tabs defaultValue="standard">
          <TabsList className="bg-muted/50 rounded-xl mb-6">
            <TabsTrigger value="standard" className="rounded-lg text-xs">Standard Form</TabsTrigger>
            <TabsTrigger value="wizard"   className="rounded-lg text-xs">Multi-step Wizard</TabsTrigger>
            <TabsTrigger value="modals"   className="rounded-lg text-xs">Modal Patterns</TabsTrigger>
          </TabsList>

          {/* ── Standard form ── */}
          <TabsContent value="standard">
            <TwoColumnLayout
              sideWidth="300px"
              main={
                <div className="bg-white rounded-card border border-border shadow-card p-6 space-y-7">

                  <FormSection title="Basic Information" description="Core identity details">
                    <div className="grid grid-cols-2 gap-4">
                      <TextField label="Distributor Name" required placeholder="e.g. Agro World Pvt Ltd" />
                      <TextField label="Distributor Code" placeholder="Auto-generated" disabled hint="Will be auto-assigned on save" />
                      <MobileField label="Primary Mobile" required />
                      <TextField label="Email Address" type="email" placeholder="contact@example.com" />
                      <PasswordField label="Portal Password" required hint="Min. 8 characters" />
                    </div>
                  </FormSection>

                  <FormSection title="Business & Tax" description="GST and financial details">
                    <div className="grid grid-cols-2 gap-4">
                      <GSTField required />
                      <HSNField />
                      <AmountField label="Credit Limit" placeholder="500000" />
                      <PercentField label="Discount %" placeholder="5" />
                      <SelectField
                        label="Payment Terms"
                        options={[
                          { label: "Immediate",  value: "immediate"  },
                          { label: "Net 30",     value: "net30"      },
                          { label: "Net 60",     value: "net60"      },
                          { label: "Net 90",     value: "net90"      },
                        ]}
                        placeholder="Select payment terms"
                      />
                      <SelectField
                        label="Category"
                        options={[
                          { label: "Platinum",   value: "platinum"   },
                          { label: "Gold",       value: "gold"       },
                          { label: "Silver",     value: "silver"     },
                        ]}
                        placeholder="Select category"
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Location & Territory" description="Address and operational area">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="State" required
                        options={[
                          { label: "Maharashtra",    value: "MH" },
                          { label: "Karnataka",      value: "KA" },
                          { label: "Madhya Pradesh", value: "MP" },
                          { label: "Rajasthan",      value: "RJ" },
                        ]}
                        placeholder="Select state"
                      />
                      <SelectField
                        label="District" required
                        options={[
                          { label: "Pune",       value: "pune"       },
                          { label: "Nashik",     value: "nashik"     },
                          { label: "Aurangabad", value: "aurangabad" },
                        ]}
                        placeholder="Select district"
                      />
                      <div className="col-span-2">
                        <TextareaField label="Full Address" required placeholder="Shop/Office address" />
                      </div>
                      <TextField label="PIN Code" maxLength={6} placeholder="411001" />
                      <GPSField />
                    </div>
                  </FormSection>

                  <FormSection title="Documents & Media" description="Upload relevant files">
                    <div className="grid grid-cols-2 gap-4">
                      <FileUploadField label="GST Certificate" accept=".pdf,.jpg,.png" hint="PDF or image, max 5MB" />
                      <FileUploadField label="PAN Card" accept=".pdf,.jpg,.png" hint="PDF or image, max 2MB" />
                    </div>
                    <div className="mt-4 flex items-start gap-4">
                      <ImageUploadField label="Profile Photo" />
                      <ImageUploadField label="Shop Front Photo" />
                    </div>
                  </FormSection>

                  <FormSection title="Preferences">
                    <div className="space-y-3">
                      {[
                        "Receive SMS alerts for orders",
                        "Receive email digest weekly",
                        "Allow field team entry edit",
                      ].map(opt => (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox id={opt} />
                          <label htmlFor={opt} className="text-sm cursor-pointer">{opt}</label>
                        </div>
                      ))}
                    </div>
                  </FormSection>
                </div>
              }
              side={
                <div className="space-y-4">
                  {/* Status card */}
                  <div className="bg-white rounded-card border border-border shadow-card p-4 space-y-3">
                    <p className="text-card-title text-foreground">Publish Settings</p>
                    <SelectField
                      options={[
                        { label: "Active",   value: "active"   },
                        { label: "Inactive", value: "inactive" },
                        { label: "Draft",    value: "draft"    },
                      ]}
                      value="active"
                    />
                    <SelectField
                      label="Assigned ASM"
                      options={[
                        { label: "Rajesh Sharma",   value: "rs" },
                        { label: "Priya Desai",     value: "pd" },
                        { label: "Amit Kulkarni",   value: "ak" },
                      ]}
                      placeholder="Select ASM"
                    />
                    <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2" onClick={handleSave} disabled={saving}>
                      {saving ? <BtnLoader /> : null}
                      Save Distributor
                    </Button>
                    <Button variant="outline" className="w-full">Save as Draft</Button>
                  </div>

                  {/* Status badges showcase */}
                  <div className="bg-white rounded-card border border-border shadow-card p-4">
                    <p className="text-card-title text-foreground mb-3">Status Tokens</p>
                    <div className="flex flex-wrap gap-2">
                      {(["active","pending","approved","rejected","draft","shipped","overdue","partial","inactive","closed"] as const).map(s => (
                        <StatusBadge key={s} status={s} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
              }
            />
          </TabsContent>

          {/* ── Multi-step wizard ── */}
          <TabsContent value="wizard">
            <div className="bg-white rounded-card border border-border shadow-card p-6">
              <div className="mb-6">
                <WizardSteps current={step} />
              </div>

              {step === 0 && (
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                  <TextField label="First Name" required placeholder="Rajesh" />
                  <TextField label="Last Name"  required placeholder="Sharma" />
                  <MobileField label="Mobile" required />
                  <TextField label="Email" type="email" placeholder="rajesh@agro.com" />
                </div>
              )}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                  <TextField label="Business Name" required placeholder="Agro World Pvt Ltd" />
                  <GSTField required />
                  <AmountField label="Credit Limit" />
                  <SelectField label="Category" options={[
                    { label: "Platinum", value: "p" },
                    { label: "Gold",     value: "g" },
                  ]} placeholder="Select" />
                </div>
              )}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4 max-w-xl">
                  <SelectField label="State" required options={[
                    { label: "Maharashtra", value: "MH" },
                    { label: "Karnataka",   value: "KA" },
                  ]} placeholder="Select" />
                  <SelectField label="District" required options={[
                    { label: "Pune",   value: "p" },
                    { label: "Nashik", value: "n" },
                  ]} placeholder="Select" />
                  <div className="col-span-2"><GPSField /></div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-3 max-w-xl">
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                    <p className="text-sm font-semibold text-brand-700 mb-2">Review your details</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-medium">Agro World Pvt Ltd</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-medium">+91 98765 43210</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-medium">Maharashtra</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="confirm" />
                    <label htmlFor="confirm" className="text-sm">I confirm all details are accurate</label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
                  Previous
                </Button>
                <span className="text-helper text-muted-foreground">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step < STEPS.length - 1 ? (
                  <Button className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => setStep(s => s + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button className="bg-brand-500 hover:bg-brand-600 text-white">Submit</Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Modal patterns ── */}
          <TabsContent value="modals">
            <div className="bg-white rounded-card border border-border shadow-card p-6">
              <p className="text-card-title text-foreground mb-4">Modal Pattern Library</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2" onClick={() => setShowDelete(true)}>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Delete Confirmation
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setShowApprove(true)}>
                  <CheckCircle2 className="w-4 h-4 text-brand-500" />
                  Approval Modal
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setShowReject(true)}>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Reject with Reason
                </Button>
              </div>
            </div>

            {/* ── Delete modal ── */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
              <DialogContent className="sm:max-w-md rounded-modal">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <DialogTitle className="text-lg">Delete Distributor</DialogTitle>
                  </div>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-foreground">Agro World Pvt Ltd</span>?
                    This action cannot be undone and all associated data will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">Delete Permanently</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── Approve modal ── */}
            <Dialog open={showApprove} onOpenChange={setShowApprove}>
              <DialogContent className="sm:max-w-md rounded-modal">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-brand-500" />
                    </div>
                    <DialogTitle className="text-lg">Approve Purchase Order</DialogTitle>
                  </div>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Review and approve PO #2341 for ₹4,24,000.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2 space-y-2">
                  {[
                    ["Vendor",   "Nashik Agro Supplies"],
                    ["Items",    "Urea 50kg × 200 bags"],
                    ["Value",    "₹4,24,000"],
                    ["Due Date", "2025-06-10"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowApprove(false)}>Cancel</Button>
                  <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approve PO
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── Reject modal ── */}
            <Dialog open={showReject} onOpenChange={setShowReject}>
              <DialogContent className="sm:max-w-md rounded-modal">
                <DialogHeader>
                  <DialogTitle>Reject with Reason</DialogTitle>
                  <DialogDescription className="text-sm">
                    Please provide a reason for rejecting this request.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <SelectField
                    label="Rejection Reason"
                    required
                    options={[
                      { label: "Insufficient documentation", value: "docs"   },
                      { label: "Budget exceeded",            value: "budget" },
                      { label: "Duplicate entry",            value: "dup"    },
                      { label: "Other",                      value: "other"  },
                    ]}
                    placeholder="Select reason"
                  />
                  <div className="mt-3">
                    <TextareaField
                      label="Additional Comments"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Provide details for the rejection…"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
                  <Button className="bg-red-500 hover:bg-red-600 text-white">Reject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </PageShell>
    </AppLayout>
  );
}
