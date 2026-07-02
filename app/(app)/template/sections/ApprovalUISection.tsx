"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check, X, Clock, MessageCircle, FileText, User, Calendar,
  IndianRupee, Package, UserPlus, ShoppingCart, Tag, CreditCard,
  Truck, ArrowUpRight, CheckCircle2, XCircle, AlertTriangle,
  Forward, Eye, Paperclip, Bell, ChevronRight, ArrowRight,
  Loader2, TrendingUp, Wheat, MoreHorizontal, Download,
  Building2, MapPin, RotateCcw, Layers,
} from "lucide-react";

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:              { label: "Pending",             bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400",  border: "border-amber-200" },
  "in-review":          { label: "In Review",           bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",   border: "border-blue-200"  },
  approved:             { label: "Approved",            bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500",border: "border-emerald-200"},
  rejected:             { label: "Rejected",            bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",    border: "border-red-200"   },
  "clarification-needed":{ label: "Clarification Needed",bg: "bg-orange-100", text: "text-orange-700",  dot: "bg-orange-400", border: "border-orange-200"},
  escalated:            { label: "Escalated",           bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500", border: "border-purple-200"},
  "auto-approved":      { label: "Auto Approved",       bg: "bg-teal-100",    text: "text-teal-700",    dot: "bg-teal-500",   border: "border-teal-200"  },
} as const;

type ApprovalStatus = keyof typeof STATUS_CFG;

function StatusPill({ status, size = "sm" }: { status: ApprovalStatus; size?: "xs" | "sm" }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${c.bg} ${c.text} ${c.border} ${size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

const URGENCY_CFG = {
  high:   { label: "Urgent",  bg: "bg-red-100",    text: "text-red-700"    },
  medium: { label: "Medium",  bg: "bg-amber-100",  text: "text-amber-700"  },
  low:    { label: "Normal",  bg: "bg-slate-100",  text: "text-slate-600"  },
};

// ── Timeline step ────────────────────────────────────────────────────────────
type TStepStatus = "done" | "active" | "pending" | "rejected" | "skipped";

interface TStep { label: string; actor?: string; date?: string; status: TStepStatus; note?: string; }

function ApprovalTimeline({ steps }: { steps: TStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const iconClass =
          step.status === "done"     ? "bg-emerald-500 text-white" :
          step.status === "active"   ? "bg-brand-600 text-white ring-4 ring-brand-100" :
          step.status === "rejected" ? "bg-red-500 text-white" :
          step.status === "skipped"  ? "bg-slate-200 text-slate-400" :
                                       "bg-white border-2 border-border text-muted-foreground";
        return (
          <div key={i} className="flex gap-3">
            {/* Line + circle */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${iconClass}`}>
                {step.status === "done"     && <Check className="w-3.5 h-3.5" />}
                {step.status === "active"   && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {step.status === "rejected" && <X className="w-3.5 h-3.5" />}
                {step.status === "pending"  && <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                {step.status === "skipped"  && <span className="w-2 h-2 rounded-full bg-slate-300" />}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 min-h-[24px] ${step.status === "done" ? "bg-emerald-300" : "bg-border"}`} />}
            </div>
            {/* Content */}
            <div className={`pb-5 flex-1 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${step.status === "pending" || step.status === "skipped" ? "text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </p>
                {step.date && <span className="text-xs text-muted-foreground">{step.date}</span>}
              </div>
              {step.actor && <p className="text-xs text-muted-foreground mt-0.5">{step.actor}</p>}
              {step.note && (
                <div className="mt-1.5 bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
                  "{step.note}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Approval data ────────────────────────────────────────────────────────────
interface Approval {
  id: string;
  module: string;
  moduleIcon: React.ElementType;
  moduleColor: string;
  title: string;
  requestedBy: { name: string; initials: string; role: string; color: string };
  date: string;
  sla: string;
  value?: string;
  status: ApprovalStatus;
  urgency: "high" | "medium" | "low";
  levelLabel: string;
  details: { label: string; value: string }[];
  timeline: TStep[];
  comments: { author: string; initials: string; date: string; text: string }[];
  documents: { name: string; size: string }[];
}

const APPROVALS: Approval[] = [
  {
    id: "APR-PO-2024-001",
    module: "Purchase Order",
    moduleIcon: Package,
    moduleColor: "bg-blue-50 text-blue-600",
    title: "Urea 50kg — 500 bags from Nashik WH",
    requestedBy: { name: "Rajesh Kumar", initials: "RK", role: "Procurement Manager", color: "bg-brand-200 text-brand-700" },
    date: "22 Jan 2024, 10:15 AM",
    sla: "Expires in 4 hours",
    value: "₹4,20,000",
    status: "in-review",
    urgency: "high",
    levelLabel: "Level 2 of 3",
    details: [
      { label: "Supplier",         value: "Krishak Agro Suppliers" },
      { label: "Delivery Date",  value: "28 Jan 2024" },
      { label: "Warehouse",      value: "Central Warehouse, Nashik" },
      { label: "Payment Terms",  value: "Net 30 days" },
      { label: "Budget Head",    value: "Fertiliser Procurement Q4" },
    ],
    timeline: [
      { label: "Request Submitted",  actor: "Rajesh Kumar",  date: "22 Jan, 9:00 AM",  status: "done",   note: "Urgent — Q4 stock replenishment" },
      { label: "Manager Review",     actor: "Priya Desai",   date: "22 Jan, 10:00 AM", status: "done",   note: "Quantities verified. Forwarding for Finance." },
      { label: "Finance Approval",   actor: "Amit Sharma",   date: "In progress",      status: "active"  },
      { label: "Director Sign-off",  actor: "Pending",                                 status: "pending" },
      { label: "PO Generated",                                                          status: "pending" },
    ],
    comments: [
      { author: "Priya Desai",  initials: "PD", date: "22 Jan, 10:00 AM", text: "Quantities match Q4 requirements. Vendor quote verified." },
      { author: "Rajesh Kumar", initials: "RK", date: "22 Jan, 9:05 AM",  text: "Please expedite — current stock below reorder point." },
    ],
    documents: [
      { name: "Vendor_Quote_Krishak.pdf", size: "324 KB" },
      { name: "Stock_Level_Report.xlsx",  size: "128 KB" },
    ],
  },
  {
    id: "APR-EXP-2024-041",
    module: "Expense Claim",
    moduleIcon: IndianRupee,
    moduleColor: "bg-amber-50 text-amber-600",
    title: "Field Visit — North Zone Q4 Survey",
    requestedBy: { name: "Priya Singh", initials: "PS", role: "Field Officer", color: "bg-amber-100 text-amber-700" },
    date: "20 Jan 2024, 3:30 PM",
    sla: "2 days remaining",
    value: "₹18,500",
    status: "pending",
    urgency: "medium",
    levelLabel: "Level 1 of 2",
    details: [
      { label: "Expense Type",   value: "Travel + Accommodation" },
      { label: "Travel Period",  value: "15–18 Jan 2024 (4 days)" },
      { label: "Locations",      value: "Pillupur, Mohanpur, Rampur" },
      { label: "Farmers Visited",value: "23 farmers" },
      { label: "Cost Centre",    value: "Field Operations — North" },
    ],
    timeline: [
      { label: "Claim Submitted", actor: "Priya Singh", date: "20 Jan, 3:30 PM", status: "done" },
      { label: "Manager Approval",actor: "Vikram Rao",  date: "Pending",         status: "active" },
      { label: "Accounts Review",                                                  status: "pending" },
      { label: "Payment Released",                                                  status: "pending" },
    ],
    comments: [],
    documents: [
      { name: "Travel_Bills_Jan24.pdf",    size: "892 KB" },
      { name: "Hotel_Receipt_Pillupur.jpg",size: "245 KB" },
    ],
  },
  {
    id: "APR-LVE-2024-017",
    module: "Leave Request",
    moduleIcon: Calendar,
    moduleColor: "bg-purple-50 text-purple-600",
    title: "Annual Leave — Family Function",
    requestedBy: { name: "Amit Sharma", initials: "AS", role: "Sales Executive", color: "bg-purple-100 text-purple-700" },
    date: "19 Jan 2024, 11:00 AM",
    sla: "Response due tomorrow",
    value: "5 days",
    status: "pending",
    urgency: "low",
    levelLabel: "Level 1 of 1",
    details: [
      { label: "Leave Type",    value: "Earned Leave (EL)" },
      { label: "From Date",     value: "25 Jan 2024 (Wednesday)" },
      { label: "To Date",       value: "29 Jan 2024 (Sunday)" },
      { label: "Handover",      value: "Neha Verma (coverage assigned)" },
      { label: "Balance",       value: "12 EL days remaining" },
    ],
    timeline: [
      { label: "Leave Applied",  actor: "Amit Sharma", date: "19 Jan, 11:00 AM", status: "done" },
      { label: "Manager Review", actor: "Vikram Rao",  date: "Awaiting",         status: "active" },
      { label: "HR Confirmation",                                                   status: "pending" },
    ],
    comments: [
      { author: "Amit Sharma", initials: "AS", date: "19 Jan, 11:00 AM", text: "Handover document shared with Neha. No pending deliverables." },
    ],
    documents: [],
  },
  {
    id: "APR-FMR-2024-088",
    module: "Farmer Registration",
    moduleIcon: Wheat,
    moduleColor: "bg-green-50 text-green-600",
    title: "New Farmer — Kamla Devi, Rampur",
    requestedBy: { name: "Sunita Bai (Field Agent)", initials: "SB", role: "Field Agent", color: "bg-green-100 text-green-700" },
    date: "21 Jan 2024, 2:00 PM",
    sla: "3 days remaining",
    value: "2.5 acres",
    status: "clarification-needed",
    urgency: "medium",
    levelLabel: "Level 2 of 2",
    details: [
      { label: "Farmer Name",  value: "Kamla Devi" },
      { label: "Village",      value: "Rampur, Dist. Nashik" },
      { label: "Land Area",    value: "2.5 acres (Survey No. 347/A)" },
      { label: "Primary Crop", value: "Soybean, Paddy" },
      { label: "Mobile",       value: "+91 98765 43215" },
    ],
    timeline: [
      { label: "Field Survey Completed", actor: "Sunita Bai",   date: "21 Jan, 10:00 AM", status: "done" },
      { label: "Document Verification",  actor: "Neha Verma",   date: "21 Jan, 2:00 PM",  status: "done",   note: "Land record unclear. Requested re-submission." },
      { label: "Clarification Requested",actor: "Neha Verma",   date: "21 Jan, 2:30 PM",  status: "active" },
      { label: "Final Registration",                                                          status: "pending" },
    ],
    comments: [
      { author: "Neha Verma", initials: "NV", date: "21 Jan, 2:30 PM", text: "Land record 7/12 extract seems outdated. Please re-upload the latest copy." },
    ],
    documents: [
      { name: "Farmer_KYC_KamlaDevi.pdf", size: "1.2 MB" },
      { name: "Field_Survey_Photo.jpg",   size: "3.4 MB" },
    ],
  },
  {
    id: "APR-SO-2024-022",
    module: "Sales Order",
    moduleIcon: ShoppingCart,
    moduleColor: "bg-sky-50 text-sky-600",
    title: "SO #2024-022 — Metro Retail Ltd",
    requestedBy: { name: "Vikram Rao", initials: "VR", role: "Sales Manager", color: "bg-sky-100 text-sky-700" },
    date: "21 Jan 2024, 4:45 PM",
    sla: "Expires in 8 hours",
    value: "₹89,750",
    status: "pending",
    urgency: "high",
    levelLabel: "Level 1 of 2",
    details: [
      { label: "Customer",      value: "Metro Retail Ltd, Pune" },
      { label: "Territory",     value: "West Zone" },
      { label: "Items",         value: "18 line items (mixed SKUs)" },
      { label: "Discount",      value: "5% (within policy)" },
      { label: "Delivery",      value: "12 Feb 2024" },
    ],
    timeline: [
      { label: "Order Created",     actor: "Vikram Rao", date: "21 Jan, 4:45 PM", status: "done" },
      { label: "Manager Approval",  actor: "Priya Desai",date: "Awaiting",        status: "active" },
      { label: "Dispatch Planning",                                                  status: "pending" },
      { label: "Order Confirmed",                                                    status: "pending" },
    ],
    comments: [],
    documents: [
      { name: "SO_MetroRetail_Draft.pdf", size: "562 KB" },
    ],
  },
];

// Module-wise pending counts (for header dropdown)
const MODULE_PENDING = [
  { module: "Purchase Orders", icon: Package,      count: 8, urgency: "high"   as const, latest: "PO #2341 — ₹4.2L awaiting Finance sign-off" },
  { module: "Expense Claims",  icon: IndianRupee,  count: 5, urgency: "medium" as const, latest: "Field visit claims from 5 field officers" },
  { module: "Leave Requests",  icon: Calendar,     count: 3, urgency: "low"    as const, latest: "2 requests due response tomorrow" },
  { module: "Farmer Registry", icon: Wheat,        count: 7, urgency: "medium" as const, latest: "7 new farmer registrations pending KYC" },
  { module: "Sales Orders",    icon: ShoppingCart, count: 4, urgency: "high"   as const, latest: "SO #2024-022 expires in 8 hours" },
  { module: "Discounts",       icon: Tag,          count: 2, urgency: "low"    as const, latest: "2 discount override requests" },
  { module: "Credit Limit",    icon: CreditCard,   count: 1, urgency: "high"   as const, latest: "₹5L credit limit increase — Metro Retail" },
  { module: "Stock Transfer",  icon: Layers,       count: 3, urgency: "medium" as const, latest: "Central → East WH transfer pending" },
  { module: "Dispatch",        icon: Truck,        count: 6, urgency: "medium" as const, latest: "6 dispatch notes pending review" },
];

// ── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setReason(""); onClose(); }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" /> Reject Request
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700 font-medium">APR-PO-2024-001 · Urea 50kg — ₹4,20,000</p>
            <p className="text-xs text-red-600 mt-0.5">This action will notify the requester and stop the approval chain.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a clear reason — the requester will see this message…"
              className="min-h-[100px] resize-none"
            />
            {reason.length === 0 && (
              <p className="text-xs text-muted-foreground">Reason is mandatory and will be sent to the requester.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <div className="flex flex-wrap gap-2">
              {["Budget exceeded", "Incomplete documents", "Policy violation", "Wrong vendor", "Duplicate request"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setReason(tag)}
                  className="text-xs px-2.5 py-1 border border-border rounded-full hover:bg-muted transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!reason.trim() || submitted}
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitted ? <><Check className="w-4 h-4 mr-1" /> Rejected</> : <><XCircle className="w-4 h-4 mr-1" /> Confirm Rejection</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Clarification modal ───────────────────────────────────────────────────────
function ClarificationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!comment.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setComment(""); onClose(); }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <MessageCircle className="w-5 h-5" /> Request Clarification
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-700 font-medium">APR-PO-2024-001 · Urea 50kg — ₹4,20,000</p>
            <p className="text-xs text-orange-600 mt-0.5">The request will be paused until clarification is provided.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Clarification Message <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What clarification do you need? Be specific…"
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Attach Document (optional)</label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-brand-300 transition-colors cursor-pointer">
              <Paperclip className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Click to attach a reference document</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!comment.trim() || submitted}
            onClick={handleSubmit}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {submitted ? <><Check className="w-4 h-4 mr-1" /> Sent</> : <><MessageCircle className="w-4 h-4 mr-1" /> Send Clarification Request</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approval Detail Panel ─────────────────────────────────────────────────────
function ApprovalDetail({
  approval, onClose, onApprove, onReject, onClarify,
}: {
  approval: Approval;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClarify: () => void;
}) {
  const [approveSuccess, setApproveSuccess] = useState(false);
  const Icon = approval.moduleIcon;

  const handleApprove = () => {
    setApproveSuccess(true);
    setTimeout(() => { setApproveSuccess(false); onApprove(); }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${approval.moduleColor}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{approval.module}</p>
            <h3 className="text-sm font-semibold text-foreground leading-tight mt-0.5">{approval.title}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusPill status={approval.status} />
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${URGENCY_CFG[approval.urgency].bg} ${URGENCY_CFG[approval.urgency].text}`}>
                {URGENCY_CFG[approval.urgency].label}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{approval.levelLabel}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Meta row */}
        <div className="px-5 py-3 border-b border-border bg-muted/20 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Request ID</p>
            <p className="text-xs font-mono text-foreground mt-0.5">{approval.id}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Requested By</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar className="w-4 h-4">
                <AvatarFallback className={`text-[9px] font-semibold ${approval.requestedBy.color}`}>
                  {approval.requestedBy.initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-foreground">{approval.requestedBy.name}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Date & Time</p>
            <p className="text-xs text-foreground mt-0.5">{approval.date}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
              {approval.module === "Leave Request" ? "Duration" : "Value"}
            </p>
            <p className="text-xs font-semibold text-foreground mt-0.5">{approval.value ?? "—"}</p>
          </div>
        </div>

        {/* SLA */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">SLA: {approval.sla}</p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Request Details */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Request Details</p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {approval.details.map((d) => (
                <div key={d.label} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                  <span className="text-xs text-foreground font-medium text-right max-w-[60%]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Timeline */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-3">Approval Timeline</p>
            <ApprovalTimeline steps={approval.timeline} />
          </div>

          {/* Documents */}
          {approval.documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Attached Documents</p>
              <div className="space-y-2">
                {approval.documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-xs text-foreground font-medium">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-muted rounded">
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Comments</p>
            {approval.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No comments yet</p>
            ) : (
              <div className="space-y-2">
                {approval.comments.map((c, i) => (
                  <div key={i} className="flex gap-2.5">
                    <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-[9px] font-semibold bg-muted">{c.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] font-semibold text-foreground">{c.author}</p>
                        <p className="text-[10px] text-muted-foreground">{c.date}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="px-5 py-4 border-t border-border bg-white flex-shrink-0 space-y-2">
        {approveSuccess ? (
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Approved successfully!</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button onClick={onReject} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs h-9">
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={onClarify} variant="outline" className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50 text-xs h-9">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Clarify
              </Button>
              <Button variant="outline" className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 text-xs h-9">
                <Forward className="w-3.5 h-3.5 mr-1.5" /> Escalate
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Header Dropdown Preview ───────────────────────────────────────────────────
function HeaderDropdownPreview() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const total = MODULE_PENDING.reduce((acc, m) => acc + m.count, 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-4">
          Click on any module to simulate navigating to that module's approval queue. This is the grouped
          approval notification panel triggered from the header "Approvals" button.
        </p>
      </div>

      {/* Simulated header bar */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Fake header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Dharitri Sutra Agri ERP</span>
          </div>
          {/* Approvals button */}
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
              <Bell className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Approvals</span>
              <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none min-w-[20px] text-center">{total}</span>
            </button>
          </div>
        </div>

        {/* Dropdown panel */}
        <div className="flex">
          {/* Module list */}
          <div className="w-72 border-r border-border">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">{total} Pending Approvals</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across {MODULE_PENDING.length} modules</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {MODULE_PENDING.map((m) => {
                const Icon = m.icon;
                const urg = URGENCY_CFG[m.urgency];
                const isSelected = selectedModule === m.module;
                return (
                  <button
                    key={m.module}
                    onClick={() => setSelectedModule(m.module)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0 ${isSelected ? "bg-brand-50" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{m.module}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${urg.bg} ${urg.text}`}>{m.count}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.latest}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <button className="w-full text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center justify-center gap-1.5">
                View All Approvals <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: selected module detail */}
          <div className="flex-1 flex items-center justify-center p-6">
            {selectedModule ? (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mx-auto">
                  <ArrowUpRight className="w-6 h-6 text-brand-600" />
                </div>
                <p className="text-sm font-semibold text-foreground">{selectedModule}</p>
                <p className="text-xs text-muted-foreground">Would navigate to the {selectedModule} approval queue</p>
                <button
                  onClick={() => setSelectedModule(null)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  ← Back
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Select a module to see its approval queue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Section ─────────────────────────────────────────────────────────────
export default function ApprovalUISection() {
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showClarify, setShowClarify] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enterprise-grade, module-wise approval UX foundation. Covers Purchase Orders, Expense Claims, Leave,
        Farmer Registration, Sales Orders, Discounts, Credit Limits, Stock Transfer, Dispatch, and more.
        Each approval includes a full detail view, multi-step timeline, document handling, comments, and
        Approve / Reject / Clarify / Escalate flows.
      </p>

      <Tabs defaultValue="inbox">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border border-border">
          <TabsTrigger value="inbox"    className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Approval Inbox</TabsTrigger>
          <TabsTrigger value="header"   className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Header Dropdown</TabsTrigger>
          <TabsTrigger value="flows"    className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Reject & Clarify Flows</TabsTrigger>
          <TabsTrigger value="statuses" className="text-xs rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Status Variants</TabsTrigger>
        </TabsList>

        <div className="mt-6">

          {/* ── APPROVAL INBOX ── */}
          <TabsContent value="inbox">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Click any approval request to open the full detail panel on the right.
                Demonstrates the master-detail pattern used across all ERP approval modules.
              </p>

              <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white" style={{ height: "600px" }}>
                <div className="flex h-full">
                  {/* Left: list */}
                  <div className={`${selectedApproval ? "w-80" : "w-full"} flex-shrink-0 border-r border-border flex flex-col transition-all`}>
                    {/* List header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Pending Approvals</p>
                        <p className="text-xs text-muted-foreground">{APPROVALS.length} requests</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* List items */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border">
                      {APPROVALS.map((appr) => {
                        const Icon = appr.moduleIcon;
                        const isSelected = selectedApproval?.id === appr.id;
                        const urg = URGENCY_CFG[appr.urgency];
                        return (
                          <button
                            key={appr.id}
                            onClick={() => setSelectedApproval(isSelected ? null : appr)}
                            className={`w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors ${isSelected ? "bg-brand-50 border-l-2 border-l-brand-600" : ""}`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${appr.moduleColor}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-xs font-semibold text-foreground truncate">{appr.module}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${urg.bg} ${urg.text}`}>
                                  {urg.label}
                                </span>
                              </div>
                              <p className="text-xs text-foreground mt-0.5 truncate">{appr.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <StatusPill status={appr.status} size="xs" />
                                {appr.value && (
                                  <span className="text-[10px] text-muted-foreground font-medium">{appr.value}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">{appr.date}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: detail panel */}
                  {selectedApproval ? (
                    <div className="flex-1 overflow-hidden">
                      <ApprovalDetail
                        approval={selectedApproval}
                        onClose={() => setSelectedApproval(null)}
                        onApprove={() => setSelectedApproval(null)}
                        onReject={() => setShowReject(true)}
                        onClarify={() => setShowClarify(true)}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-muted/10">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Eye className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Select an Approval</p>
                        <p className="text-xs text-muted-foreground mt-1">Click any request from the list to review it</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── HEADER DROPDOWN ── */}
          <TabsContent value="header">
            <HeaderDropdownPreview />
          </TabsContent>

          {/* ── REJECT & CLARIFY FLOWS ── */}
          <TabsContent value="flows">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Reject flow */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Reject Flow</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mandatory reason field. Requester is notified immediately. Quick-reason tags speed up common rejections.
                    </p>
                  </div>
                  {/* Static preview */}
                  <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <p className="text-sm font-semibold text-red-600">Reject Request</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-700 font-medium">APR-PO-2024-001 · Urea 50kg — ₹4,20,000</p>
                      <p className="text-xs text-red-600 mt-0.5">This will notify the requester and stop the approval chain.</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Reason <span className="text-red-500">*</span></p>
                      <div className="border border-border rounded-lg p-3 min-h-[80px] bg-muted/20">
                        <p className="text-xs text-muted-foreground italic">Provide a clear reason…</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["Budget exceeded", "Incomplete docs", "Policy violation", "Duplicate request"].map(t => (
                        <span key={t} className="text-xs px-2 py-1 border border-border rounded-full text-muted-foreground">{t}</span>
                      ))}
                    </div>
                    <Button onClick={() => setShowReject(true)} className="w-full bg-red-600 hover:bg-red-700 text-white text-xs">
                      <XCircle className="w-3.5 h-3.5 mr-2" /> Try Live Reject Modal →
                    </Button>
                  </div>
                </div>

                {/* Clarification flow */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Clarification Flow</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pauses the approval. Requester sees the message and can upload a response.
                      Approval resumes after clarification is provided.
                    </p>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                      <p className="text-sm font-semibold text-orange-600">Request Clarification</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-orange-700 font-medium">APR-FMR-2024-088 · New Farmer — Kamla Devi</p>
                      <p className="text-xs text-orange-600 mt-0.5">Request will be paused until clarification is provided.</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Clarification Message <span className="text-red-500">*</span></p>
                      <div className="border border-border rounded-lg p-3 min-h-[80px] bg-muted/20">
                        <p className="text-xs text-muted-foreground italic">What clarification is needed?…</p>
                      </div>
                    </div>
                    <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
                      <Paperclip className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Attach a reference document (optional)</p>
                    </div>
                    <Button onClick={() => setShowClarify(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs">
                      <MessageCircle className="w-3.5 h-3.5 mr-2" /> Try Live Clarification Modal →
                    </Button>
                  </div>
                </div>
              </div>

              {/* Escalation note */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Forward className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold text-purple-700">Escalation / Forward Flow</p>
                </div>
                <p className="text-xs text-purple-700/80">
                  When an approver cannot decide, they escalate to a higher authority. The system records
                  the escalation with reason, updates the SLA clock, and notifies the new approver.
                  Escalated approvals are marked with a purple "Escalated" status badge.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ── STATUS VARIANTS ── */}
          <TabsContent value="statuses">
            <div className="space-y-6">
              {/* Status badges */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">All Status Variants</h4>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(STATUS_CFG) as ApprovalStatus[]).map(s => (
                    <div key={s} className="flex flex-col items-start gap-1.5">
                      <StatusPill status={s} />
                      <p className="text-[10px] text-muted-foreground">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Approval cards by module */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Module-Specific Approval Cards</h4>
                <div className="grid grid-cols-1 gap-3">
                  {APPROVALS.map(appr => {
                    const Icon = appr.moduleIcon;
                    return (
                      <div key={appr.id} className="flex items-center gap-4 p-4 bg-white border border-border rounded-xl hover:shadow-sm transition-shadow">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${appr.moduleColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-semibold text-muted-foreground">{appr.module}</p>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <p className="text-[10px] font-mono text-muted-foreground">{appr.id}</p>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{appr.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Avatar className="w-4 h-4">
                                <AvatarFallback className="text-[8px] bg-muted">{appr.requestedBy.initials}</AvatarFallback>
                              </Avatar>
                              {appr.requestedBy.name}
                            </div>
                            {appr.value && <span className="text-xs font-semibold text-foreground">· {appr.value}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <StatusPill status={appr.status} />
                          <div className="flex gap-1.5">
                            <button className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
                              <X className="w-3.5 h-3.5 text-red-600" />
                            </button>
                            <button className="p-1.5 hover:bg-muted border border-border rounded-lg transition-colors">
                              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Timeline variants */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Approval Timeline Variants</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Purchase Order (3 of 4 levels done)</p>
                    <div className="bg-white border border-border rounded-xl p-4">
                      <ApprovalTimeline steps={[
                        { label: "Submitted",        actor: "Rajesh Kumar",   date: "Jan 20",  status: "done"    },
                        { label: "Manager Approved", actor: "Priya Desai",    date: "Jan 20",  status: "done",   note: "Quantities verified" },
                        { label: "Finance Review",   actor: "Amit Sharma",    date: "Jan 22",  status: "done"    },
                        { label: "Director Sign-off",actor: "Pending",        date: "Awaiting",status: "active"  },
                        { label: "PO Generated",                                               status: "pending" },
                      ]} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Expense Claim (rejected at level 2)</p>
                    <div className="bg-white border border-border rounded-xl p-4">
                      <ApprovalTimeline steps={[
                        { label: "Claim Submitted",  actor: "Priya Singh",    date: "Jan 18",  status: "done"    },
                        { label: "Manager Review",   actor: "Vikram Rao",     date: "Jan 19",  status: "rejected", note: "Bills older than 30 days — policy violation" },
                        { label: "Accounts Review",                                             status: "skipped" },
                        { label: "Payment Released",                                            status: "skipped" },
                      ]} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

        </div>
      </Tabs>

      {/* Usage guide */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-brand-700 mb-3">Approval System — Platform Standard</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-brand-800/80">
          <p>• Each module has its own approval chain configuration (1–4 levels)</p>
          <p>• Approval requests are grouped in the header dropdown by module</p>
          <p>• Urgency badges (Urgent/Medium/Normal) are auto-computed from SLA</p>
          <p>• Reject requires a mandatory reason — sent immediately to requester</p>
          <p>• Clarification pauses the chain until requester responds</p>
          <p>• Escalation reassigns to a higher authority with reason tracking</p>
          <p>• All actions (approve/reject/clarify/escalate) are audit-logged</p>
          <p>• Multi-step timeline shows each level with actor, date, and comment</p>
          <p>• Documents can be attached at request time or during clarification</p>
          <p>• SLA countdown triggers auto-escalation when deadline is breached</p>
          <p>• Bulk approval supported for low-risk, low-value routine requests</p>
          <p>• Mobile-friendly — approvals can be actioned from any device</p>
        </div>
      </div>

      {/* Modals */}
      <RejectModal      open={showReject}  onClose={() => setShowReject(false)}  />
      <ClarificationModal open={showClarify} onClose={() => setShowClarify(false)} />
    </div>
  );
}
