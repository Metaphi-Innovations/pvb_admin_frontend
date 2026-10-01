/**
 * Fully populated UI/UX demo employee — fake data only.
 * Not a real person; used for Employee Profile visual review.
 */
import type { HrEmployee } from "./employee-master-data";

export const DEMO_EMPLOYEE_CODE = "EMP-DEMO-001";

/** Optional employee-level summaries for profile operational sections (display only). */
export interface EmployeeProfileSummaries {
  onboarding?: {
    status: string;
    startDate: string;
    completionDate: string;
    assignedHr: string;
    checklistAssigned: number;
    checklistCompleted: number;
    checklistPending: number;
    checklistItems: { item: string; status: string; completedOn?: string }[];
  };
  attendance?: {
    shift?: string;
    shiftId?: number;
    attendancePolicyId?: number;
    weeklyOff?: string;
    present: number;
    absent: number;
    leave: number;
  };
  leaveBalances?: { type: string; available: number }[];
  payroll?: {
    structure: string;
    /** Assigned structure id — preferred over name match */
    structureId?: number | null;
    effectiveFrom: string;
    /** Legacy display string (often annual). Prefer monthlyCtc for calculations. */
    ctc: string;
    /** Monthly CTC in rupees — source of truth for salary resolution */
    monthlyCtc?: number | null;
    status: string;
    /**
     * Manual PT jurisdiction override (legacy). PT State is normally Branch-derived.
     * null / omitted = derive from assigned Branch.
     */
    ptStateOverride?: string | null;
    /** Employee-level PF applicability. Default true when unset. */
    pfApplicable?: boolean;
    /** Employee-level ESI applicability. Default true when unset. */
    esiApplicable?: boolean;
    /** LWF applicability: auto | yes | no. Default auto. */
    lwfApplicable?: "auto" | "yes" | "no" | boolean;
    /**
     * Employee tax regime choice for TDS projection.
     * company_default → Tax Settings company default; old/new → that regime.
     */
    taxRegime?: "old" | "new" | "company_default";
  };
  hrLetters?: { type: string; issuedOn: string }[];
  timelineExtras?: { id: string; at: string; label: string; detail: string }[];
}

export function buildDemoEmployee(id: number): HrEmployee {
  return {
    id,
    employeeCode: DEMO_EMPLOYEE_CODE,
    employeeName: "Aarav Deshmukh",
    mobileNumber: "9876543210",
    emailId: "aarav.deshmukh@company.com",
    department: "Sales Force",
    designation: "Area Sales Manager (ASM)",
    reportingManagerId: 2,
    reportingManagerName: "Vikram Mehta",
    branch: "branch-mumbai",
    employeeType: "permanent",
    employmentStatus: "active",
    dateOfJoining: "2024-04-01",
    status: "active",
    createdBy: "System Demo",
    updatedBy: "System Demo",
    createdAt: "2024-03-25",
    updatedAt: "2024-10-01",
    personal: {
      dateOfBirth: "1995-06-15",
      gender: "Male",
      maritalStatus: "Married",
      bloodGroup: "B+",
      nationality: "India",
      fatherName: "Suresh Deshmukh",
      motherName: "Meena Deshmukh",
    },
    contact: {
      personalEmail: "aarav.demo@gmail.com",
      alternateMobile: "9123456780",
      permanentSameAsCurrent: false,
      currentAddress: {
        line1: "Flat 702, Green Valley Apartments",
        line2: "Baner Road",
        pincode: "411045",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
      },
      permanentAddress: {
        line1: "House 18, Shanti Nagar",
        line2: "College Road",
        pincode: "422005",
        city: "Nashik",
        state: "Maharashtra",
        country: "India",
      },
    },
    emergency: {
      contactName: "Neha Deshmukh",
      relationship: "Spouse",
      mobileNumber: "9988776655",
      alternateNumber: "9000012345",
    },
    employmentExtra: {
      probationEndDate: "2024-09-30",
      confirmationDate: "2024-10-01",
      workLocation: "Pune",
    },
    bank: {
      accountHolderName: "Aarav Deshmukh",
      bankName: "HDFC Bank",
      accountNumber: "123456789012",
      ifscCode: "HDFC0001234",
      bankBranch: "Baner, Pune",
      accountType: "Savings",
      bankProofName: "",
      verificationStatus: "",
    },
    governmentIds: {
      pan: "ABCDE1234F",
      aadhaar: "123456789012",
      uan: "100012345678",
      pfNumber: "MH/PUN/1234567",
      esicNumber: "3100123456",
      passportNumber: "N1234567",
      passportExpiry: "2031-12-31",
      drivingLicenceNumber: "MH1420240012345",
      drivingLicenceExpiry: "2034-06-30",
    },
    education: [
      {
        id: "demo-edu-1",
        qualification: "Bachelor of Business Administration",
        specialization: "Marketing",
        institution: "Savitribai Phule Pune University",
        university: "SPPU",
        startYear: "2013",
        endYear: "2016",
        grade: "72%",
        certificateName: "",
      },
      {
        id: "demo-edu-2",
        qualification: "MBA",
        specialization: "Sales & Marketing",
        institution: "Symbiosis Institute of Management Studies",
        university: "Symbiosis International University",
        startYear: "2018",
        endYear: "2020",
        grade: "8.2 CGPA",
        certificateName: "",
      },
    ],
    experience: [
      {
        id: "demo-exp-1",
        employerName: "Nova Consumer Products Pvt Ltd",
        designation: "Sales Executive",
        employmentType: "Full Time",
        startDate: "2016-07-01",
        endDate: "2018-05-31",
        reasonForLeaving: "Career growth",
        experienceLetterName: "",
        relievingLetterName: "",
      },
      {
        id: "demo-exp-2",
        employerName: "GreenCrop Industries Ltd",
        designation: "Territory Sales Manager",
        employmentType: "Full Time",
        startDate: "2020-07-01",
        endDate: "2024-03-15",
        reasonForLeaving: "Joined current organization",
        experienceLetterName: "",
        relievingLetterName: "",
      },
    ],
    documents: [
      {
        id: "demo-doc-pan",
        documentType: "PAN Card",
        documentName: "PAN Card Copy",
        documentNumber: "ABCDE1234F",
        fileName: "aarav-pan-card.pdf",
        uploadedDate: "",
        expiryDate: "",
        verificationStatus: "missing",
        verifiedBy: "",
        verifiedDate: "",
        comment: "",
      },
    ],
    profileSummaries: {
      onboarding: {
        status: "Completed",
        startDate: "2024-03-25",
        completionDate: "2024-04-05",
        assignedHr: "Priya Nair",
        checklistAssigned: 6,
        checklistCompleted: 6,
        checklistPending: 0,
        checklistItems: [
          { item: "Employee Details Completed", status: "Completed", completedOn: "2024-03-26" },
          { item: "Bank Details Added", status: "Completed", completedOn: "2024-03-28" },
          { item: "Government IDs Added", status: "Completed", completedOn: "2024-03-28" },
          { item: "Joining Documents Collected", status: "Completed", completedOn: "2024-04-01" },
          { item: "Manager Assigned", status: "Completed", completedOn: "2024-03-25" },
          { item: "Welcome Orientation Completed", status: "Completed", completedOn: "2024-04-05" },
        ],
      },
      attendance: {
        shift: "General Shift",
        shiftId: 1,
        weeklyOff: "Sunday Off",
        present: 18,
        absent: 1,
        leave: 2,
      },
      /** @deprecated Unused by Leave & Balance UI — see leave-balance-data store */
      leaveBalances: [
        { type: "Casual Leave", available: 6 },
        { type: "Sick Leave", available: 4 },
        { type: "Optional Leave", available: 1 },
      ],
      payroll: {
        structure: "Standard Staff Structure",
        structureId: 1,
        effectiveFrom: "2024-04-01",
        ctc: "₹12,00,000 annually",
        monthlyCtc: 100000,
        status: "Active",
        pfApplicable: true,
        esiApplicable: true,
        lwfApplicable: "auto",
        taxRegime: "company_default",
      },
      hrLetters: [
        { type: "Appointment Letter", issuedOn: "2024-04-01" },
        { type: "Confirmation Letter", issuedOn: "2024-10-01" },
      ],
      timelineExtras: [
        {
          id: "joined",
          at: "2024-04-01",
          label: "Joined organization",
          detail: "Date of joining",
        },
        {
          id: "probation-end",
          at: "2024-09-30",
          label: "Probation completed",
          detail: "Probation end date",
        },
        {
          id: "confirmed",
          at: "2024-10-01",
          label: "Employment confirmed",
          detail: "Confirmation date",
        },
      ],
    },
  };
}
