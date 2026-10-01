"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit2 } from "lucide-react";
import {
  RecordDetailPage,
  OVERVIEW_TAB,
  type RecordDetailSidebarProps,
} from "@/components/record-detail";
import { TadaClaimForm } from "../components/TadaClaimForm";
import {
  claimToForm,
  getTadaClaimById,
  CLAIM_STATUS_LABEL,
  type TadaClaimFormValues,
  type ClaimStatus,
} from "../tada-claim-data";

function claimStatusVariant(status: ClaimStatus): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "approved" || status === "paid") return "active";
  if (status === "draft") return "draft";
  if (status === "rejected") return "blocked";
  if (status === "pending_approval" || status === "submitted") return "neutral";
  return "inactive";
}

function claimApprovalTone(status: ClaimStatus): "pending" | "approved" | "rejected" | "neutral" {
  if (status === "pending_approval" || status === "submitted") return "pending";
  if (status === "approved" || status === "paid") return "approved";
  if (status === "rejected") return "rejected";
  return "neutral";
}

export default function ViewTadaClaimPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<TadaClaimFormValues | null>(null);
  const [claimNumber, setClaimNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [claimAmount, setClaimAmount] = useState(0);
  const [claimTypeLabel, setClaimTypeLabel] = useState("");
  const [status, setStatus] = useState<ClaimStatus>("draft");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const c = getTadaClaimById(id);
    if (!c) {
      router.replace("/hr/claims/tada");
      return;
    }
    setForm(claimToForm(c));
    setClaimNumber(c.claimNumber);
    setEmployeeName(c.employeeName);
    setClaimAmount(c.claimAmount);
    setClaimTypeLabel(c.claimType.replace(/_/g, " "));
    setStatus(c.status);
  }, [id, router]);

  if (!form) return null;

  const quickActions: RecordDetailSidebarProps["quickActions"] = [];
  if (status === "draft" || status === "rejected") {
    quickActions.push({
      label: "Edit Claim",
      icon: Edit2,
      onClick: () => router.push(`/hr/claims/tada/${id}/edit`),
    });
  }

  const sidebar: RecordDetailSidebarProps = {
    quickActions,
    summary: [
      { label: "Employee", value: employeeName || "—" },
      { label: "Claim Date", value: form.claimDate || "—" },
      { label: "Period", value: `${form.periodFrom || "—"} – ${form.periodTo || "—"}` },
      { label: "Claim Type", value: claimTypeLabel || "—" },
      {
        label: "Claim Amount",
        value: claimAmount ? `₹${claimAmount.toLocaleString("en-IN")}` : "—",
        highlight: true,
      },
    ],
    approval: [
      {
        label: "Status",
        value: CLAIM_STATUS_LABEL[status] ?? status,
        tone: claimApprovalTone(status),
      },
    ],
  };

  return (
    <RecordDetailPage
      listHref="/hr/claims/tada"
      listLabel="TA/DA Claims"
      recordName={employeeName || "TA/DA Claim"}
      recordCode={claimNumber}
      statusLabel={CLAIM_STATUS_LABEL[status] ?? status}
      statusVariant={claimStatusVariant(status)}
      tabs={[OVERVIEW_TAB]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      sidebar={sidebar}
    >
      {activeTab === "overview" && (
        <TadaClaimForm form={form} onChange={() => {}} claimNumber={claimNumber} readOnly />
      )}
    </RecordDetailPage>
  );
}
