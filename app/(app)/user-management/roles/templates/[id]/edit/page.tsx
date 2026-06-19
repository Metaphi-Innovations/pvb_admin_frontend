"use client";

import React from "react";
import { useParams } from "next/navigation";
import TemplateForm from "../../components/TemplateForm";

export default function EditTemplatePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  return <TemplateForm mode="edit" templateId={id} />;
}
