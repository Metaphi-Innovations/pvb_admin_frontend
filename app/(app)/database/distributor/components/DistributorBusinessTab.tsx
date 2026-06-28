"use client";

import React, { useMemo } from "react";
import { Building2, Handshake, Smartphone } from "lucide-react";
import type { Distributor } from "../distributor-data";
import {
  ProfileCard,
  ProfileCardGrid,
} from "../../farmer/components/FarmerDetailSections";
import {
  buildCompanyGradeMapping,
  formatAmountInCrores,
  parseCompaniesDealingIn,
} from "@/lib/distributor/distributor-scoring";
import {
  DistributorDetailField,
  DistributorFieldGrid,
} from "./DistributorDetailFields";
import { CompanyChips } from "./CompanyChips";

function GradeSection({
  title,
  companies,
}: {
  title: string;
  companies: string[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {companies.length > 0 ? (
        <CompanyChips companies={companies} />
      ) : (
        <p className="text-xs text-muted-foreground">—</p>
      )}
    </div>
  );
}

export function DistributorBusinessTab({ distributor }: { distributor: Distributor }) {
  const companies = useMemo(
    () => parseCompaniesDealingIn(distributor.companiesDealingIn),
    [distributor.companiesDealingIn],
  );

  const gradeMapping = useMemo(
    () => buildCompanyGradeMapping(companies),
    [companies],
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      {distributor.source === "sfa" && (
        <div className="flex w-full items-start gap-2 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2.5">
          <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-600" />
          <p className="text-[11px] text-navy-700">
            SFA Mobile submission — business profile only. Scoring and credit are on the Score
            &amp; Credit tab.
          </p>
        </div>
      )}

      <ProfileCardGrid cols={2}>
        <ProfileCard title="Commercial Profile" icon={Handshake} className="md:col-span-2">
          <DistributorFieldGrid cols={4}>
            <DistributorDetailField
              label="Annual Turnover"
              value={formatAmountInCrores(distributor.annualTurnover)}
            />
            <DistributorDetailField
              label="Years in Business"
              value={distributor.yearsInBusiness}
              mono
            />
            <DistributorDetailField
              label="Annual Business Plan FY27"
              value={formatAmountInCrores(distributor.annualBusinessPotential)}
            />
            <DistributorDetailField label="Farmer Network" value={distributor.farmerNetwork} />
          </DistributorFieldGrid>
        </ProfileCard>

        <ProfileCard title="Companies Dealing In" icon={Building2} className="md:col-span-2">
          <div className="space-y-3">
            <CompanyChips companies={companies} />
            <div className="grid grid-cols-1 gap-3 border-t border-border/60 pt-3 sm:grid-cols-3">
              <GradeSection title="Grade A" companies={gradeMapping.gradeA} />
              <GradeSection title="Grade B" companies={gradeMapping.gradeB} />
              <GradeSection title="Other Companies" companies={gradeMapping.others} />
            </div>
          </div>
        </ProfileCard>
      </ProfileCardGrid>
    </div>
  );
}
