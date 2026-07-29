import type { ModuleKey } from "@/config/permissions";

export type PrototypeFieldType = "text" | "number" | "date" | "select" | "textarea" | "email" | "tel";

export interface PrototypeFieldDef {
  key: string;
  label: string;
  type: PrototypeFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Grid col span on sm+ (1 or 2). Default 1. */
  span?: 1 | 2;
  /** Sample value for view/edit demo */
  sample?: string;
}

export interface PrototypeFormSchema {
  moduleKey: string;
  sections: { title: string; description?: string; fields: PrototypeFieldDef[] }[];
}

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const statusOpts = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const departments = [
  { value: "sales", label: "Sales" },
  { value: "ops", label: "Operations" },
  { value: "fin", label: "Finance" },
  { value: "hr", label: "Human Resources" },
  { value: "mid", label: "Mid Office" },
];

const employees = [
  { value: "emp_aisha", label: "Aisha Rahman" },
  { value: "emp_omar", label: "Omar Khalid" },
  { value: "emp_priya", label: "Priya Nair" },
  { value: "emp_james", label: "James Cole" },
  { value: "emp_layla", label: "Layla Hassan" },
];

const leaveTypes = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity" },
  { value: "unpaid", label: "Unpaid" },
  { value: "hajj", label: "Hajj" },
];

const shifts = [
  { value: "std", label: "09:00–18:00 Standard" },
  { value: "eve", label: "14:00–23:00 Evening" },
  { value: "flex", label: "Flex core hours" },
];

const grades = [
  { value: "g1", label: "G1 — Junior" },
  { value: "g3", label: "G3 — Executive" },
  { value: "g5", label: "G5 — Manager" },
  { value: "g7", label: "G7 — Director" },
];

const warehouses = [
  { value: "wh_dxb1", label: "WH-DXB-01 — Dubai Main" },
  { value: "wh_dxb2", label: "WH-DXB-02 — Dubai Branch Store" },
  { value: "wh_auh1", label: "WH-AUH-01 — Abu Dhabi Hub" },
  { value: "wh_shj1", label: "WH-SHJ-01 — Sharjah Transit" },
];

const invCategories = [
  { value: "merch", label: "Travel Merchandise" },
  { value: "it", label: "IT Hardware" },
  { value: "office", label: "Office Consumables" },
  { value: "ticket", label: "Ticketing Supplies" },
  { value: "mkt", label: "Marketing Collateral" },
];

const uoms = [
  { value: "ea", label: "Each (EA)" },
  { value: "box", label: "Box (BOX)" },
  { value: "pk", label: "Pack (PK)" },
  { value: "ctn", label: "Carton (CTN)" },
];

const vendorsInv = [
  { value: "v_eos", label: "Emirates Office Supplies" },
  { value: "v_git", label: "Gulf IT Solutions" },
  { value: "v_tmc", label: "Travel Merch Co" },
  { value: "v_sky", label: "Skyline Print Services" },
];

const skus = [
  { value: "sku_tkt", label: "SKU-TKT-001 — Airline ticket wallet" },
  { value: "sku_bag", label: "SKU-BAG-120 — Branded cabin bag" },
  { value: "sku_sim", label: "SKU-SIM-UAE — UAE tourist SIM" },
  { value: "sku_usb", label: "SKU-USB-PWR — USB power bank 20k" },
  { value: "sku_prn", label: "SKU-PRN-TN — Printer toner black" },
];

const invDocStatus = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "in_transit", label: "In Transit" },
  { value: "posted", label: "Posted" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const currencyOpts = [
  { value: "AED", label: "AED" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "INR", label: "INR" },
];

const extranetStatusOpts = [
  { value: "active", label: "Active" },
  { value: "pending_review", label: "Pending Review" },
  { value: "live", label: "Live" },
  { value: "suspended", label: "Suspended" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
  { value: "under_negotiation", label: "Under Negotiation" },
  { value: "blocked", label: "Blocked" },
];

const properties = [
  { value: "prop_grand_plaza", label: "Grand Plaza Hotel — Dubai Marina" },
  { value: "prop_marina_bay", label: "Marina Bay Resort — Abu Dhabi" },
  { value: "prop_desert_oasis", label: "Desert Oasis Villas — Al Ain" },
  { value: "prop_skyline", label: "Skyline Business Hotel — Downtown Dubai" },
  { value: "prop_coral_beach", label: "Coral Beach Resort — Ras Al Khaimah" },
  { value: "prop_palm_grove", label: "Palm Grove Suites — Dubai" },
  { value: "prop_al_waha", label: "Al Waha Heritage Hotel — Sharjah" },
  { value: "prop_emerald_city", label: "Emerald City Hotel — Dubai" },
];

const channels = [
  { value: "booking", label: "Booking.com" },
  { value: "expedia", label: "Expedia" },
  { value: "agoda", label: "Agoda" },
  { value: "airbnb", label: "Airbnb" },
  { value: "hotels", label: "Hotels.com" },
  { value: "trip", label: "Trip.com" },
  { value: "direct", label: "Direct" },
];

const starRatings = [
  { value: "3", label: "3 star" },
  { value: "4", label: "4 star" },
  { value: "5", label: "5 star" },
];

const ratingOpts = [
  { value: "5", label: "5 — Excellent" },
  { value: "4", label: "4 — Very good" },
  { value: "3", label: "3 — Good" },
  { value: "2", label: "2 — Fair" },
  { value: "1", label: "1 — Poor" },
];

const procurementStatusOpts = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "sent_to_vendor", label: "Sent to Vendor" },
  { value: "quoted", label: "Quoted" },
  { value: "ordered", label: "Ordered" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const procurementVendors = [
  { value: "pv_dell", label: "Dell Technologies FZE" },
  { value: "pv_emirates_office", label: "Emirates Office Supplies" },
  { value: "pv_gulf_it", label: "Gulf IT Solutions" },
  { value: "pv_al_futtaim", label: "Al Futtaim Furniture" },
  { value: "pv_skyline_print", label: "Skyline Print Services" },
  { value: "pv_continental", label: "Continental Catering Co" },
  { value: "pv_securelogix", label: "SecureLogix Systems" },
  { value: "pv_prime_facilities", label: "Prime Facilities Management" },
];

const procurementDepartments = [
  { value: "it", label: "IT Department" },
  { value: "sales", label: "Sales" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
  { value: "ops", label: "Operations" },
];

const FORMS: Record<string, PrototypeFormSchema> = {
  hrmsEmployees: {
    moduleKey: "hrmsEmployees",
    sections: [
      {
        title: "Identity",
        fields: [
          { key: "employeeCode", label: "Employee code", type: "text", required: true, sample: "EMP-1042" },
          { key: "fullName", label: "Full name", type: "text", required: true, sample: "Aisha Rahman", span: 1 },
          { key: "email", label: "Work email", type: "email", required: true, sample: "aisha@regency.travel" },
          { key: "mobile", label: "Mobile", type: "tel", sample: "+971 50 123 4567" },
        ],
      },
      {
        title: "Organization",
        fields: [
          { key: "department", label: "Department", type: "select", options: departments, required: true, sample: "sales" },
          { key: "designation", label: "Designation", type: "text", sample: "Sales Executive" },
          { key: "grade", label: "Grade / band", type: "select", options: grades, sample: "g3" },
          { key: "reportingTo", label: "Reporting manager", type: "select", options: employees, sample: "emp_layla" },
          { key: "joinDate", label: "Date of joining", type: "date", required: true, sample: "2023-04-12" },
          { key: "employmentType", label: "Employment type", type: "select", options: [
            { value: "permanent", label: "Permanent" },
            { value: "contract", label: "Contract" },
            { value: "probation", label: "Probation" },
          ], sample: "permanent" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
        ],
      },
    ],
  },
  attendanceDaily: {
    moduleKey: "attendanceDaily",
    sections: [
      {
        title: "Attendance entry",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "date", label: "Attendance date", type: "date", required: true, sample: "2026-07-28" },
          { key: "shift", label: "Shift", type: "select", options: shifts, sample: "std" },
          { key: "status", label: "Day status", type: "select", options: [
            { value: "present", label: "Present" },
            { value: "late", label: "Late" },
            { value: "absent", label: "Absent" },
            { value: "wfh", label: "Work from home" },
            { value: "leave", label: "On leave" },
          ], required: true, sample: "present" },
          { key: "inTime", label: "In time", type: "text", placeholder: "HH:mm", sample: "09:05" },
          { key: "outTime", label: "Out time", type: "text", placeholder: "HH:mm", sample: "18:10" },
          { key: "remarks", label: "Remarks", type: "textarea", span: 2, sample: "Slight delay — traffic" },
        ],
      },
    ],
  },
  attendanceRoster: {
    moduleKey: "attendanceRoster",
    sections: [
      {
        title: "Shift roster",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_omar" },
          { key: "weekStart", label: "Week starting", type: "date", required: true, sample: "2026-07-27" },
          { key: "shift", label: "Assigned shift", type: "select", options: shifts, required: true, sample: "eve" },
          { key: "location", label: "Work location", type: "text", sample: "Dubai HQ" },
          { key: "notes", label: "Notes", type: "textarea", span: 2, sample: "Evening ticketing desk coverage" },
        ],
      },
    ],
  },
  attendanceRegularization: {
    moduleKey: "attendanceRegularization",
    sections: [
      {
        title: "Regularization request",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "date", label: "Date to regularize", type: "date", required: true, sample: "2026-07-24" },
          { key: "reason", label: "Reason", type: "select", options: [
            { value: "missed_punch", label: "Missed punch" },
            { value: "ot", label: "Overtime claim" },
            { value: "swap", label: "Shift swap" },
            { value: "other", label: "Other" },
          ], required: true, sample: "missed_punch" },
          { key: "requestedIn", label: "Requested in", type: "text", sample: "09:00" },
          { key: "requestedOut", label: "Requested out", type: "text", sample: "18:00" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "pending" },
          { key: "comments", label: "Comments", type: "textarea", span: 2, sample: "Forgot to punch out" },
        ],
      },
    ],
  },
  leaveRequests: {
    moduleKey: "leaveRequests",
    sections: [
      {
        title: "Leave application",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_priya" },
          { key: "leaveType", label: "Leave type", type: "select", options: leaveTypes, required: true, sample: "annual" },
          { key: "fromDate", label: "From date", type: "date", required: true, sample: "2026-08-10" },
          { key: "toDate", label: "To date", type: "date", required: true, sample: "2026-08-14" },
          { key: "days", label: "No. of days", type: "number", sample: "5" },
          { key: "halfDay", label: "Half day", type: "select", options: yesNo, sample: "no" },
          { key: "approver", label: "Approver", type: "select", options: employees, sample: "emp_layla" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "pending" },
          { key: "reason", label: "Reason", type: "textarea", span: 2, required: true, sample: "Family vacation" },
        ],
      },
    ],
  },
  leaveBalance: {
    moduleKey: "leaveBalance",
    sections: [
      {
        title: "Leave balance",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "leaveType", label: "Leave type", type: "select", options: leaveTypes, required: true, sample: "annual" },
          { key: "opening", label: "Opening balance", type: "number", sample: "22" },
          { key: "availed", label: "Availed", type: "number", sample: "9.5" },
          { key: "pending", label: "Pending requests", type: "number", sample: "2" },
          { key: "closing", label: "Closing balance", type: "number", sample: "12.5" },
          { key: "year", label: "Leave year", type: "text", sample: "2026" },
        ],
      },
    ],
  },
  leavePolicy: {
    moduleKey: "leavePolicy",
    sections: [
      {
        title: "Policy setup",
        fields: [
          { key: "name", label: "Policy name", type: "text", required: true, sample: "Annual leave policy 2026", span: 2 },
          { key: "leaveType", label: "Leave type", type: "select", options: leaveTypes, required: true, sample: "annual" },
          { key: "accrual", label: "Accrual method", type: "select", options: [
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly credit" },
            { value: "none", label: "No accrual" },
          ], sample: "monthly" },
          { key: "entitlement", label: "Annual entitlement (days)", type: "number", sample: "30" },
          { key: "carryForward", label: "Max carry forward", type: "number", sample: "5" },
          { key: "probationAllowed", label: "Allowed in probation", type: "select", options: yesNo, sample: "no" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2, sample: "UAE Labour Law aligned" },
        ],
      },
    ],
  },
  payrollStructure: {
    moduleKey: "payrollStructure",
    sections: [
      {
        title: "Salary structure",
        fields: [
          { key: "code", label: "Structure code", type: "text", required: true, sample: "STR-EXEC" },
          { key: "name", label: "Structure name", type: "text", required: true, sample: "Executive CTC band", span: 2 },
          { key: "grade", label: "Applicable grade", type: "select", options: grades, sample: "g5" },
          { key: "currency", label: "Currency", type: "select", options: [
            { value: "AED", label: "AED" },
            { value: "USD", label: "USD" },
          ], sample: "AED" },
          { key: "basicPct", label: "Basic % of CTC", type: "number", sample: "40" },
          { key: "housingPct", label: "Housing %", type: "number", sample: "25" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  payrollRun: {
    moduleKey: "payrollRun",
    sections: [
      {
        title: "Payroll run",
        fields: [
          { key: "period", label: "Pay period", type: "text", required: true, sample: "2026-07", placeholder: "YYYY-MM" },
          { key: "runDate", label: "Process date", type: "date", sample: "2026-07-28" },
          { key: "company", label: "Company", type: "text", sample: "Regency Travel LLC" },
          { key: "employeeCount", label: "Employee count", type: "number", sample: "186" },
          { key: "gross", label: "Gross payroll", type: "number", sample: "642500" },
          { key: "net", label: "Net payroll", type: "number", sample: "598200" },
          { key: "status", label: "Status", type: "select", options: [
            { value: "draft", label: "Draft" },
            { value: "calculated", label: "Calculated" },
            { value: "approved", label: "Approved" },
            { value: "paid", label: "Paid" },
          ], sample: "calculated" },
          { key: "notes", label: "Notes", type: "textarea", span: 2, sample: "Includes ticket allowance accrual" },
        ],
      },
    ],
  },
  payrollLoans: {
    moduleKey: "payrollLoans",
    sections: [
      {
        title: "Loan / advance",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_omar" },
          { key: "type", label: "Type", type: "select", options: [
            { value: "advance", label: "Salary advance" },
            { value: "loan", label: "Loan" },
            { value: "travel", label: "Travel advance" },
          ], required: true, sample: "advance" },
          { key: "amount", label: "Amount", type: "number", required: true, sample: "5000" },
          { key: "emi", label: "EMI / recovery", type: "number", sample: "1000" },
          { key: "startDate", label: "Start date", type: "date", sample: "2026-08-01" },
          { key: "installments", label: "No. of installments", type: "number", sample: "5" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "approved" },
          { key: "reason", label: "Reason", type: "textarea", span: 2, sample: "Emergency family support" },
        ],
      },
    ],
  },
  recruitmentJobs: {
    moduleKey: "recruitmentJobs",
    sections: [
      {
        title: "Job opening",
        fields: [
          { key: "title", label: "Job title", type: "text", required: true, sample: "Ticketing executive", span: 2 },
          { key: "department", label: "Department", type: "select", options: departments, sample: "ops" },
          { key: "grade", label: "Grade", type: "select", options: grades, sample: "g3" },
          { key: "positions", label: "No. of openings", type: "number", sample: "2" },
          { key: "location", label: "Location", type: "text", sample: "Dubai" },
          { key: "employmentType", label: "Employment type", type: "select", options: [
            { value: "permanent", label: "Permanent" },
            { value: "contract", label: "Contract" },
          ], sample: "permanent" },
          { key: "status", label: "Status", type: "select", options: [
            { value: "open", label: "Open" },
            { value: "on_hold", label: "On hold" },
            { value: "closed", label: "Closed" },
          ], sample: "open" },
          { key: "description", label: "Job description", type: "textarea", span: 2, sample: "GDS ticketing, fare construction, customer handling" },
        ],
      },
    ],
  },
  recruitmentCandidates: {
    moduleKey: "recruitmentCandidates",
    sections: [
      {
        title: "Candidate",
        fields: [
          { key: "name", label: "Full name", type: "text", required: true, sample: "Sara Ali" },
          { key: "email", label: "Email", type: "email", sample: "sara.ali@email.com" },
          { key: "mobile", label: "Mobile", type: "tel", sample: "+971 55 987 6543" },
          { key: "job", label: "Applied for", type: "text", sample: "Ticketing executive" },
          { key: "source", label: "Source", type: "select", options: [
            { value: "portal", label: "Career portal" },
            { value: "referral", label: "Referral" },
            { value: "agency", label: "Agency" },
            { value: "linkedin", label: "LinkedIn" },
          ], sample: "linkedin" },
          { key: "stage", label: "Pipeline stage", type: "select", options: [
            { value: "applied", label: "Applied" },
            { value: "screen", label: "Screening" },
            { value: "interview", label: "Interview" },
            { value: "offer", label: "Offer" },
            { value: "hired", label: "Hired" },
            { value: "rejected", label: "Rejected" },
          ], sample: "interview" },
          { key: "notes", label: "Notes", type: "textarea", span: 2, sample: "Strong Amadeus experience" },
        ],
      },
    ],
  },
  recruitmentInterviews: {
    moduleKey: "recruitmentInterviews",
    sections: [
      {
        title: "Interview schedule",
        fields: [
          { key: "candidate", label: "Candidate", type: "text", required: true, sample: "Sara Ali" },
          { key: "round", label: "Round", type: "select", options: [
            { value: "hr", label: "HR screen" },
            { value: "technical", label: "Technical" },
            { value: "final", label: "Final / management" },
          ], sample: "technical" },
          { key: "date", label: "Interview date", type: "date", sample: "2026-07-30" },
          { key: "time", label: "Time", type: "text", sample: "11:00" },
          { key: "interviewer", label: "Interviewer", type: "select", options: employees, sample: "emp_layla" },
          { key: "mode", label: "Mode", type: "select", options: [
            { value: "onsite", label: "On-site" },
            { value: "teams", label: "Microsoft Teams" },
            { value: "phone", label: "Phone" },
          ], sample: "teams" },
          { key: "outcome", label: "Outcome", type: "select", options: statusOpts, sample: "pending" },
          { key: "feedback", label: "Feedback", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  performanceGoals: {
    moduleKey: "performanceGoals",
    sections: [
      {
        title: "Goal / KPI",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "period", label: "Review period", type: "text", sample: "Q3 2026" },
          { key: "title", label: "Goal title", type: "text", required: true, sample: "Q3 booking target", span: 2 },
          { key: "metric", label: "Metric", type: "text", sample: "Confirmed bookings" },
          { key: "target", label: "Target", type: "number", sample: "120" },
          { key: "weight", label: "Weight %", type: "number", sample: "40" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  performanceAppraisals: {
    moduleKey: "performanceAppraisals",
    sections: [
      {
        title: "Appraisal",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "cycle", label: "Appraisal cycle", type: "text", sample: "Mid-year 2026" },
          { key: "rating", label: "Overall rating", type: "select", options: [
            { value: "5", label: "5 — Outstanding" },
            { value: "4", label: "4 — Exceeds" },
            { value: "3", label: "3 — Meets" },
            { value: "2", label: "2 — Needs improvement" },
            { value: "1", label: "1 — Unsatisfactory" },
          ], sample: "4" },
          { key: "reviewer", label: "Reviewer", type: "select", options: employees, sample: "emp_layla" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "pending" },
          { key: "summary", label: "Summary", type: "textarea", span: 2, sample: "Strong sales performance; coaching on documentation" },
        ],
      },
    ],
  },
  letters: {
    moduleKey: "letters",
    sections: [
      {
        title: "HR letter",
        fields: [
          { key: "template", label: "Letter type", type: "select", options: [
            { value: "offer", label: "Offer letter" },
            { value: "experience", label: "Experience certificate" },
            { value: "warning", label: "Warning letter" },
            { value: "confirmation", label: "Confirmation letter" },
          ], required: true, sample: "offer" },
          { key: "employee", label: "Employee / candidate", type: "select", options: employees, sample: "emp_james" },
          { key: "issueDate", label: "Issue date", type: "date", sample: "2026-07-28" },
          { key: "refNo", label: "Reference no.", type: "text", sample: "LTR-2026-0142" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "draft" },
          { key: "body", label: "Letter body / notes", type: "textarea", span: 2, sample: "Prototype template — final wording TBD" },
        ],
      },
    ],
  },
  employeeDocuments: {
    moduleKey: "employeeDocuments",
    sections: [
      {
        title: "Employee document",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_aisha" },
          { key: "docType", label: "Document type", type: "select", options: [
            { value: "passport", label: "Passport" },
            { value: "eid", label: "Emirates ID" },
            { value: "visa", label: "Visa" },
            { value: "contract", label: "Contract" },
          ], required: true, sample: "passport" },
          { key: "docNo", label: "Document no.", type: "text", sample: "P1234567" },
          { key: "issueDate", label: "Issue date", type: "date", sample: "2022-01-15" },
          { key: "expiryDate", label: "Expiry date", type: "date", sample: "2032-01-14" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  resignation: {
    moduleKey: "resignation",
    sections: [
      {
        title: "Resignation",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_james" },
          { key: "resignDate", label: "Resignation date", type: "date", required: true, sample: "2026-07-20" },
          { key: "lastWorking", label: "Last working day", type: "date", sample: "2026-08-19" },
          { key: "noticeDays", label: "Notice period (days)", type: "number", sample: "30" },
          { key: "reason", label: "Reason category", type: "select", options: [
            { value: "career", label: "Career growth" },
            { value: "personal", label: "Personal" },
            { value: "relocation", label: "Relocation" },
            { value: "other", label: "Other" },
          ], sample: "career" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "pending" },
          { key: "comments", label: "Comments", type: "textarea", span: 2, sample: "Serving full notice" },
        ],
      },
    ],
  },
  gratuity: {
    moduleKey: "gratuity",
    sections: [
      {
        title: "Gratuity / EOSB",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_james" },
          { key: "serviceYears", label: "Years of service", type: "number", sample: "5.2" },
          { key: "basicSalary", label: "Basic salary (AED)", type: "number", sample: "8000" },
          { key: "estimated", label: "Estimated gratuity", type: "number", sample: "24000" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "draft" },
          { key: "notes", label: "Notes", type: "textarea", span: 2, sample: "UAE Labour Law calculation — demo only" },
        ],
      },
    ],
  },
  settlement: {
    moduleKey: "settlement",
    sections: [
      {
        title: "Full & final settlement",
        fields: [
          { key: "employee", label: "Employee", type: "select", options: employees, required: true, sample: "emp_james" },
          { key: "lastWorking", label: "Last working day", type: "date", sample: "2026-08-19" },
          { key: "salaryDue", label: "Salary due", type: "number", sample: "4500" },
          { key: "leaveEncash", label: "Leave encashment", type: "number", sample: "3200" },
          { key: "gratuity", label: "Gratuity", type: "number", sample: "24000" },
          { key: "deductions", label: "Deductions", type: "number", sample: "500" },
          { key: "netPayable", label: "Net payable", type: "number", sample: "31200" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "pending" },
          { key: "clearance", label: "Clearance notes", type: "textarea", span: 2, sample: "IT + Finance clearance pending" },
        ],
      },
    ],
  },
  hrmsGrade: {
    moduleKey: "hrmsGrade",
    sections: [
      {
        title: "Grade / band master",
        fields: [
          { key: "code", label: "Grade code", type: "text", required: true, sample: "G5" },
          { key: "name", label: "Grade name", type: "text", required: true, sample: "Manager" },
          { key: "level", label: "Level order", type: "number", sample: "5" },
          { key: "minCtc", label: "Min CTC", type: "number", sample: "180000" },
          { key: "maxCtc", label: "Max CTC", type: "number", sample: "280000" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "description", label: "Description", type: "textarea", span: 2, sample: "People manager band" },
        ],
      },
    ],
  },
  hrmsShift: {
    moduleKey: "hrmsShift",
    sections: [
      {
        title: "Shift master",
        fields: [
          { key: "code", label: "Shift code", type: "text", required: true, sample: "STD" },
          { key: "name", label: "Shift name", type: "text", required: true, sample: "Standard day" },
          { key: "startTime", label: "Start time", type: "text", sample: "09:00" },
          { key: "endTime", label: "End time", type: "text", sample: "18:00" },
          { key: "breakMins", label: "Break (minutes)", type: "number", sample: "60" },
          { key: "graceMins", label: "Grace period (mins)", type: "number", sample: "10" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  hrmsLeaveType: {
    moduleKey: "hrmsLeaveType",
    sections: [
      {
        title: "Leave type master",
        fields: [
          { key: "code", label: "Code", type: "text", required: true, sample: "ANNUAL" },
          { key: "name", label: "Name", type: "text", required: true, sample: "Annual Leave" },
          { key: "paid", label: "Paid leave", type: "select", options: yesNo, sample: "yes" },
          { key: "gender", label: "Gender restriction", type: "select", options: [
            { value: "all", label: "All" },
            { value: "female", label: "Female only" },
            { value: "male", label: "Male only" },
          ], sample: "all" },
          { key: "maxDays", label: "Max days / year", type: "number", sample: "30" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  hrmsHolidayCalendar: {
    moduleKey: "hrmsHolidayCalendar",
    sections: [
      {
        title: "Holiday",
        fields: [
          { key: "name", label: "Holiday name", type: "text", required: true, sample: "UAE National Day", span: 2 },
          { key: "date", label: "Date", type: "date", required: true, sample: "2026-12-02" },
          { key: "type", label: "Type", type: "select", options: [
            { value: "public", label: "Public holiday" },
            { value: "company", label: "Company holiday" },
            { value: "optional", label: "Optional" },
          ], sample: "public" },
          { key: "region", label: "Applicable region", type: "text", sample: "UAE" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  hrmsSalaryComponent: {
    moduleKey: "hrmsSalaryComponent",
    sections: [
      {
        title: "Salary component",
        fields: [
          { key: "code", label: "Component code", type: "text", required: true, sample: "BASIC" },
          { key: "name", label: "Component name", type: "text", required: true, sample: "Basic salary" },
          { key: "type", label: "Type", type: "select", options: [
            { value: "earning", label: "Earning" },
            { value: "deduction", label: "Deduction" },
            { value: "employer", label: "Employer contribution" },
          ], sample: "earning" },
          { key: "calc", label: "Calculation", type: "select", options: [
            { value: "fixed", label: "Fixed amount" },
            { value: "pct_ctc", label: "% of CTC" },
            { value: "pct_basic", label: "% of basic" },
          ], sample: "pct_ctc" },
          { key: "taxable", label: "Taxable", type: "select", options: yesNo, sample: "yes" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  hrmsDocumentType: {
    moduleKey: "hrmsDocumentType",
    sections: [
      {
        title: "Document type",
        fields: [
          { key: "code", label: "Code", type: "text", required: true, sample: "PASSPORT" },
          { key: "name", label: "Name", type: "text", required: true, sample: "Passport" },
          { key: "mandatory", label: "Mandatory on join", type: "select", options: yesNo, sample: "yes" },
          { key: "hasExpiry", label: "Has expiry", type: "select", options: yesNo, sample: "yes" },
          { key: "alertDays", label: "Expiry alert (days)", type: "number", sample: "60" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  hrmsDashboard: {
    moduleKey: "hrmsDashboard",
    sections: [
      {
        title: "Dashboard filter (demo)",
        description: "Visual only — final widgets will bind to live HR metrics.",
        fields: [
          { key: "company", label: "Company", type: "text", sample: "Regency Travel LLC" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
          { key: "department", label: "Department", type: "select", options: departments, sample: "sales" },
        ],
      },
    ],
  },

  inventoryDashboard: {
    moduleKey: "inventoryDashboard",
    sections: [
      {
        title: "Dashboard filter (demo)",
        description: "Visual only — widgets will bind to live stock metrics.",
        fields: [
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, sample: "wh_dxb1" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
          { key: "category", label: "Category", type: "select", options: invCategories, sample: "merch" },
        ],
      },
    ],
  },

  warehouse: {
    moduleKey: "warehouse",
    sections: [
      {
        title: "Warehouse",
        fields: [
          { key: "code", label: "Warehouse code", type: "text", required: true, sample: "WH-DXB-01" },
          { key: "name", label: "Name", type: "text", required: true, sample: "Dubai Main" },
          {
            key: "type",
            label: "Type",
            type: "select",
            options: [
              { value: "main", label: "Main" },
              { value: "branch", label: "Branch" },
              { value: "transit", label: "Transit" },
              { value: "virtual", label: "Virtual / Drop-ship" },
            ],
            sample: "main",
          },
          { key: "manager", label: "Storekeeper", type: "select", options: employees, sample: "emp_omar" },
          { key: "address", label: "Address", type: "textarea", span: 2, sample: "Plot 12, Dubai Logistics City" },
          { key: "city", label: "City", type: "text", sample: "Dubai" },
          { key: "country", label: "Country", type: "text", sample: "UAE" },
          { key: "allowNegative", label: "Allow negative stock", type: "select", options: yesNo, sample: "no" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
        ],
      },
    ],
  },

  products: {
    moduleKey: "products",
    sections: [
      {
        title: "Item / SKU",
        fields: [
          { key: "sku", label: "SKU code", type: "text", required: true, sample: "SKU-BAG-120" },
          { key: "name", label: "Item name", type: "text", required: true, sample: "Branded cabin bag" },
          { key: "category", label: "Category", type: "select", options: invCategories, required: true, sample: "merch" },
          { key: "uom", label: "Base UOM", type: "select", options: uoms, required: true, sample: "ea" },
          {
            key: "itemType",
            label: "Item type",
            type: "select",
            options: [
              { value: "stock", label: "Stock item" },
              { value: "nonstock", label: "Non-stock" },
              { value: "service", label: "Service" },
            ],
            sample: "stock",
          },
          {
            key: "valuation",
            label: "Valuation method",
            type: "select",
            options: [
              { value: "avg", label: "Moving average" },
              { value: "fifo", label: "FIFO" },
              { value: "std", label: "Standard cost" },
            ],
            sample: "avg",
          },
        ],
      },
      {
        title: "Costing & reorder",
        fields: [
          { key: "unitCost", label: "Unit cost", type: "number", sample: "85" },
          { key: "salePrice", label: "Sale / issue price", type: "number", sample: "120" },
          { key: "reorderLevel", label: "Reorder level", type: "number", sample: "25" },
          { key: "reorderQty", label: "Reorder qty", type: "number", sample: "50" },
          { key: "minQty", label: "Minimum qty", type: "number", sample: "10" },
          { key: "maxQty", label: "Maximum qty", type: "number", sample: "200" },
          { key: "barcode", label: "Barcode", type: "text", sample: "6281001234567" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },

  inventoryCategory: {
    moduleKey: "inventoryCategory",
    sections: [
      {
        title: "Category",
        fields: [
          { key: "code", label: "Code", type: "text", required: true, sample: "MERCH" },
          { key: "name", label: "Name", type: "text", required: true, sample: "Travel Merchandise" },
          { key: "parent", label: "Parent category", type: "text", placeholder: "Optional" },
          { key: "glAccount", label: "Inventory GL", type: "text", sample: "1300-Inventory" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },

  inventoryUom: {
    moduleKey: "inventoryUom",
    sections: [
      {
        title: "Unit of measure",
        fields: [
          { key: "code", label: "UOM code", type: "text", required: true, sample: "BOX" },
          { key: "name", label: "Name", type: "text", required: true, sample: "Box" },
          { key: "baseUom", label: "Base UOM", type: "select", options: uoms, sample: "ea" },
          { key: "conversion", label: "Conversion factor", type: "number", sample: "12", placeholder: "1 BOX = N base" },
          { key: "decimal", label: "Allow decimals", type: "select", options: yesNo, sample: "no" },
          { key: "status", label: "Status", type: "select", options: statusOpts, sample: "active" },
        ],
      },
    ],
  },

  purchaseOrders: {
    moduleKey: "purchaseOrders",
    sections: [
      {
        title: "Purchase order header",
        fields: [
          { key: "poNumber", label: "PO number", type: "text", required: true, sample: "PO-INV-7841" },
          { key: "vendor", label: "Vendor", type: "select", options: vendorsInv, required: true, sample: "v_eos" },
          { key: "warehouse", label: "Ship to warehouse", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          { key: "orderDate", label: "Order date", type: "date", required: true, sample: "2026-07-20" },
          { key: "expectedDate", label: "Expected delivery", type: "date", sample: "2026-07-28" },
          { key: "currency", label: "Currency", type: "text", sample: "AED" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "open" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
      {
        title: "Line (demo — single line)",
        description: "Full multi-line grid ships with the live module.",
        fields: [
          { key: "sku", label: "Item", type: "select", options: skus, required: true, sample: "sku_prn" },
          { key: "qty", label: "Ordered qty", type: "number", required: true, sample: "40" },
          { key: "uom", label: "UOM", type: "select", options: uoms, sample: "ea" },
          { key: "unitPrice", label: "Unit price", type: "number", sample: "45" },
        ],
      },
    ],
  },

  stockIn: {
    moduleKey: "stockIn",
    sections: [
      {
        title: "Goods receipt (GRN)",
        fields: [
          { key: "grnNumber", label: "GRN number", type: "text", required: true, sample: "GRN-4521" },
          { key: "poRef", label: "PO reference", type: "text", sample: "PO-INV-7841" },
          { key: "vendor", label: "Vendor", type: "select", options: vendorsInv, sample: "v_eos" },
          { key: "warehouse", label: "Receive into", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          { key: "receiptDate", label: "Receipt date", type: "date", required: true, sample: "2026-07-24" },
          { key: "invoiceRef", label: "Vendor invoice #", type: "text", sample: "INV-1187" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "posted" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
      {
        title: "Line (demo)",
        fields: [
          { key: "sku", label: "Item", type: "select", options: skus, required: true, sample: "sku_prn" },
          { key: "qtyOrdered", label: "Ordered qty", type: "number", sample: "40" },
          { key: "qtyReceived", label: "Received qty", type: "number", required: true, sample: "40" },
          { key: "uom", label: "UOM", type: "select", options: uoms, sample: "ea" },
        ],
      },
    ],
  },

  stockOut: {
    moduleKey: "stockOut",
    sections: [
      {
        title: "Stock issue",
        fields: [
          { key: "issueNumber", label: "Issue number", type: "text", required: true, sample: "ISS-2201" },
          { key: "warehouse", label: "Issue from", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          {
            key: "reason",
            label: "Issue reason",
            type: "select",
            options: [
              { value: "dept", label: "Department issue" },
              { value: "event", label: "Event / promo" },
              { value: "writeoff", label: "Write-off / damage" },
              { value: "sale", label: "Direct sale" },
            ],
            sample: "dept",
          },
          { key: "department", label: "Department", type: "select", options: departments, sample: "sales" },
          { key: "requestedBy", label: "Requested by", type: "select", options: employees, sample: "emp_aisha" },
          { key: "issueDate", label: "Issue date", type: "date", required: true, sample: "2026-07-25" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "posted" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
      {
        title: "Line (demo)",
        fields: [
          { key: "sku", label: "Item", type: "select", options: skus, required: true, sample: "sku_bag" },
          { key: "qty", label: "Issue qty", type: "number", required: true, sample: "5" },
          { key: "uom", label: "UOM", type: "select", options: uoms, sample: "ea" },
        ],
      },
    ],
  },

  stockTransfers: {
    moduleKey: "stockTransfers",
    sections: [
      {
        title: "Stock transfer",
        fields: [
          { key: "transferNumber", label: "Transfer number", type: "text", required: true, sample: "TRF-1101" },
          { key: "fromWh", label: "From warehouse", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          { key: "toWh", label: "To warehouse", type: "select", options: warehouses, required: true, sample: "wh_auh1" },
          { key: "transferDate", label: "Transfer date", type: "date", required: true, sample: "2026-07-22" },
          { key: "expectedArrival", label: "Expected arrival", type: "date", sample: "2026-07-23" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "in_transit" },
          { key: "carrier", label: "Carrier / vehicle", type: "text", sample: "Internal van" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
      {
        title: "Line (demo)",
        fields: [
          { key: "sku", label: "Item", type: "select", options: skus, required: true, sample: "sku_sim" },
          { key: "qty", label: "Transfer qty", type: "number", required: true, sample: "100" },
          { key: "uom", label: "UOM", type: "select", options: uoms, sample: "pk" },
        ],
      },
    ],
  },

  stockAdjustment: {
    moduleKey: "stockAdjustment",
    sections: [
      {
        title: "Stock adjustment",
        fields: [
          { key: "adjNumber", label: "Adjustment number", type: "text", required: true, sample: "ADJ-901" },
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          {
            key: "reason",
            label: "Reason",
            type: "select",
            options: [
              { value: "count", label: "Cycle count variance" },
              { value: "damage", label: "Damage / loss" },
              { value: "found", label: "Found stock" },
              { value: "uom", label: "UOM / data correction" },
            ],
            sample: "count",
          },
          { key: "adjDate", label: "Adjustment date", type: "date", required: true, sample: "2026-07-26" },
          { key: "approvedBy", label: "Approved by", type: "select", options: employees, sample: "emp_priya" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "posted" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
      {
        title: "Line (demo)",
        fields: [
          { key: "sku", label: "Item", type: "select", options: skus, required: true, sample: "sku_prn" },
          { key: "systemQty", label: "System qty", type: "number", sample: "48" },
          { key: "countedQty", label: "Counted / new qty", type: "number", required: true, sample: "45" },
          { key: "uom", label: "UOM", type: "select", options: uoms, sample: "ea" },
        ],
      },
    ],
  },

  stockTake: {
    moduleKey: "stockTake",
    sections: [
      {
        title: "Stock take / cycle count",
        fields: [
          { key: "countNumber", label: "Count number", type: "text", required: true, sample: "STK-JUL-01" },
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, required: true, sample: "wh_dxb1" },
          {
            key: "countType",
            label: "Count type",
            type: "select",
            options: [
              { value: "full", label: "Full physical" },
              { value: "cycle", label: "Cycle count" },
              { value: "spot", label: "Spot check" },
            ],
            sample: "full",
          },
          { key: "category", label: "Category scope", type: "select", options: invCategories, sample: "it" },
          { key: "countDate", label: "Count date", type: "date", required: true, sample: "2026-07-27" },
          { key: "countedBy", label: "Counted by", type: "select", options: employees, sample: "emp_omar" },
          { key: "status", label: "Status", type: "select", options: invDocStatus, sample: "open" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },

  stockOnHand: {
    moduleKey: "stockOnHand",
    sections: [
      {
        title: "Stock on hand filter",
        description: "Report criteria — export uses the same filters in the live build.",
        fields: [
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, sample: "wh_dxb1" },
          { key: "category", label: "Category", type: "select", options: invCategories, sample: "merch" },
          { key: "sku", label: "Item / SKU", type: "select", options: skus, sample: "sku_bag" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
          { key: "includeZero", label: "Include zero stock", type: "select", options: yesNo, sample: "no" },
        ],
      },
    ],
  },

  stockLedger: {
    moduleKey: "stockLedger",
    sections: [
      {
        title: "Stock ledger filter",
        fields: [
          { key: "sku", label: "Item / SKU", type: "select", options: skus, required: true, sample: "sku_tkt" },
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, sample: "wh_dxb1" },
          { key: "fromDate", label: "From date", type: "date", sample: "2026-07-01" },
          { key: "toDate", label: "To date", type: "date", sample: "2026-07-28" },
          {
            key: "txnType",
            label: "Transaction type",
            type: "select",
            options: [
              { value: "all", label: "All" },
              { value: "in", label: "Stock in" },
              { value: "out", label: "Stock out" },
              { value: "trf", label: "Transfer" },
              { value: "adj", label: "Adjustment" },
            ],
            sample: "all",
          },
        ],
      },
    ],
  },

  lowStock: {
    moduleKey: "lowStock",
    sections: [
      {
        title: "Low stock / reorder filter",
        fields: [
          { key: "warehouse", label: "Warehouse", type: "select", options: warehouses, sample: "wh_dxb1" },
          { key: "category", label: "Category", type: "select", options: invCategories, sample: "office" },
          {
            key: "severity",
            label: "Severity",
            type: "select",
            options: [
              { value: "all", label: "All alerts" },
              { value: "reorder", label: "At reorder point" },
              { value: "min", label: "Below minimum" },
              { value: "critical", label: "Critical (zero / negative)" },
            ],
            sample: "all",
          },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
        ],
      },
    ],
  },

  // Procurement
  procurementDashboard: {
    moduleKey: "procurementDashboard",
    sections: [
      {
        title: "Dashboard filter (demo)",
        description: "Visual only — final widgets will bind to live procurement metrics.",
        fields: [
          { key: "department", label: "Department", type: "select", options: procurementDepartments, sample: "it" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
        ],
      },
    ],
  },
  purchaseRequisitions: {
    moduleKey: "purchaseRequisitions",
    sections: [
      {
        title: "Purchase requisition",
        fields: [
          { key: "requisitionNumber", label: "Requisition number", type: "text", required: true, sample: "PR-2026-0142" },
          { key: "department", label: "Department", type: "select", options: procurementDepartments, required: true, sample: "it" },
          { key: "requestedBy", label: "Requested by", type: "select", options: employees, sample: "emp_omar" },
          { key: "item", label: "Item / description", type: "text", required: true, sample: "Laptops — 10 units", span: 2 },
          { key: "quantity", label: "Quantity", type: "number", sample: "10" },
          { key: "estimatedCost", label: "Estimated cost", type: "number", sample: "24000" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          { key: "neededBy", label: "Needed by", type: "date", sample: "2026-08-15" },
          {
            key: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "low", label: "Low" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ],
            sample: "normal",
          },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "pending_approval" },
          { key: "justification", label: "Justification", type: "textarea", span: 2, sample: "Replacing end-of-life IT equipment" },
        ],
      },
    ],
  },
  rfq: {
    moduleKey: "rfq",
    sections: [
      {
        title: "Request for quotation",
        fields: [
          { key: "rfqNumber", label: "RFQ number", type: "text", required: true, sample: "RFQ-2026-0031" },
          { key: "title", label: "Title", type: "text", required: true, sample: "Corporate Laptops (50 units)", span: 2 },
          {
            key: "category",
            label: "Category",
            type: "select",
            options: [
              { value: "it", label: "IT Equipment" },
              { value: "office", label: "Office Supplies" },
              { value: "services", label: "Services" },
              { value: "facilities", label: "Facilities" },
              { value: "travel", label: "Travel" },
            ],
            sample: "it",
          },
          { key: "issueDate", label: "Issue date", type: "date", sample: "2026-07-15" },
          { key: "responseDeadline", label: "Response deadline", type: "date", sample: "2026-07-29" },
          { key: "vendorsInvited", label: "Vendors invited", type: "number", sample: "5" },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "sent_to_vendor" },
          { key: "scope", label: "Scope of work", type: "textarea", span: 2, sample: "50x business laptops, 16GB RAM, 3-year warranty" },
        ],
      },
    ],
  },
  procurementOrders: {
    moduleKey: "procurementOrders",
    sections: [
      {
        title: "Purchase order",
        fields: [
          { key: "poNumber", label: "PO number", type: "text", required: true, sample: "PROC-2026-0087" },
          { key: "vendor", label: "Vendor", type: "select", options: procurementVendors, required: true, sample: "pv_dell" },
          { key: "orderDate", label: "Order date", type: "date", required: true, sample: "2026-07-20" },
          { key: "expectedDelivery", label: "Expected delivery", type: "date", sample: "2026-08-05" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          { key: "totalAmount", label: "Total amount", type: "number", sample: "58000" },
          {
            key: "paymentTerms",
            label: "Payment terms",
            type: "select",
            options: [
              { value: "net30", label: "Net 30" },
              { value: "net60", label: "Net 60" },
              { value: "net90", label: "Net 90" },
              { value: "advance", label: "Advance" },
              { value: "cod", label: "Cash on delivery" },
            ],
            sample: "net30",
          },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "ordered" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  vendors: {
    moduleKey: "vendors",
    sections: [
      {
        title: "Vendor",
        fields: [
          { key: "vendorCode", label: "Vendor code", type: "text", required: true, sample: "VEN-0042" },
          { key: "vendorName", label: "Vendor name", type: "text", required: true, sample: "Dell Technologies FZE", span: 2 },
          {
            key: "category",
            label: "Category",
            type: "select",
            options: [
              { value: "it", label: "IT" },
              { value: "office", label: "Office Supplies" },
              { value: "facilities", label: "Facilities" },
              { value: "catering", label: "Catering" },
              { value: "logistics", label: "Logistics" },
              { value: "print", label: "Print & Signage" },
            ],
            sample: "it",
          },
          { key: "contactPerson", label: "Contact person", type: "text", sample: "Ahmed Saeed" },
          { key: "email", label: "Email", type: "email", sample: "sales@dell-fze.example" },
          { key: "phone", label: "Phone", type: "tel", sample: "+971 4 123 4567" },
          {
            key: "paymentTerms",
            label: "Payment terms",
            type: "select",
            options: [
              { value: "net30", label: "Net 30" },
              { value: "net60", label: "Net 60" },
              { value: "net90", label: "Net 90" },
              { value: "advance", label: "Advance" },
            ],
            sample: "net30",
          },
          { key: "rating", label: "Vendor rating", type: "select", options: ratingOpts, sample: "4" },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "approved" },
        ],
      },
    ],
  },
  goodsReceipt: {
    moduleKey: "goodsReceipt",
    sections: [
      {
        title: "Goods receipt note",
        fields: [
          { key: "grnNumber", label: "GRN number", type: "text", required: true, sample: "GRN-2026-0219" },
          { key: "poRef", label: "PO reference", type: "text", sample: "PROC-2026-0087" },
          { key: "vendor", label: "Vendor", type: "select", options: procurementVendors, sample: "pv_dell" },
          { key: "receiptDate", label: "Receipt date", type: "date", required: true, sample: "2026-08-05" },
          { key: "receivedBy", label: "Received by", type: "select", options: employees, sample: "emp_omar" },
          {
            key: "inspectionStatus",
            label: "Inspection status",
            type: "select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "passed", label: "Passed" },
              { value: "failed", label: "Failed" },
              { value: "partial", label: "Partial" },
            ],
            sample: "passed",
          },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "received" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  vendorInvoices: {
    moduleKey: "vendorInvoices",
    sections: [
      {
        title: "Vendor invoice",
        fields: [
          { key: "invoiceNumber", label: "Invoice number", type: "text", required: true, sample: "INV-4521" },
          { key: "vendor", label: "Vendor", type: "select", options: procurementVendors, required: true, sample: "pv_dell" },
          { key: "poRef", label: "PO reference", type: "text", sample: "PROC-2026-0087" },
          { key: "invoiceDate", label: "Invoice date", type: "date", sample: "2026-08-06" },
          { key: "dueDate", label: "Due date", type: "date", sample: "2026-09-05" },
          { key: "amount", label: "Amount", type: "number", sample: "58000" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          {
            key: "matchStatus",
            label: "3-way match status",
            type: "select",
            options: [
              { value: "matched", label: "Matched" },
              { value: "discrepancy", label: "Discrepancy" },
              { value: "pending", label: "Pending" },
            ],
            sample: "matched",
          },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "invoiced" },
        ],
      },
    ],
  },
  procurementContracts: {
    moduleKey: "procurementContracts",
    sections: [
      {
        title: "Vendor contract",
        fields: [
          { key: "contractNumber", label: "Contract number", type: "text", required: true, sample: "PC-2026-0018" },
          { key: "vendor", label: "Vendor", type: "select", options: procurementVendors, required: true, sample: "pv_gulf_it" },
          {
            key: "contractType",
            label: "Contract type",
            type: "select",
            options: [
              { value: "msa", label: "Master Service Agreement" },
              { value: "annual", label: "Annual" },
              { value: "project", label: "Project-based" },
            ],
            sample: "annual",
          },
          { key: "startDate", label: "Start date", type: "date", sample: "2026-01-01" },
          { key: "endDate", label: "End date", type: "date", sample: "2026-12-31" },
          { key: "value", label: "Contract value", type: "number", sample: "180000" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          { key: "renewalNoticeDays", label: "Renewal notice (days)", type: "number", sample: "60" },
          { key: "status", label: "Status", type: "select", options: procurementStatusOpts, sample: "approved" },
          { key: "terms", label: "Key terms", type: "textarea", span: 2, sample: "Annual IT support & maintenance SLA" },
        ],
      },
    ],
  },
  procurementReports: {
    moduleKey: "procurementReports",
    sections: [
      {
        title: "Report filter (demo)",
        description: "Visual only — export uses the same filters in the live build.",
        fields: [
          {
            key: "reportType",
            label: "Report type",
            type: "select",
            options: [
              { value: "spend", label: "Spend by Category" },
              { value: "vendor_perf", label: "Vendor Performance" },
              { value: "savings", label: "Savings Realized" },
              { value: "compliance", label: "Contract Compliance" },
              { value: "cycle_time", label: "Cycle Time" },
              { value: "maverick", label: "Maverick Spend" },
            ],
            sample: "spend",
          },
          { key: "fromDate", label: "From date", type: "date", sample: "2026-07-01" },
          { key: "toDate", label: "To date", type: "date", sample: "2026-07-28" },
          { key: "department", label: "Department", type: "select", options: procurementDepartments, sample: "it" },
        ],
      },
    ],
  },

  // Extranet
  extranetDashboard: {
    moduleKey: "extranetDashboard",
    sections: [
      {
        title: "Dashboard filter (demo)",
        description: "Visual only — final widgets will bind to live extranet metrics.",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, sample: "prop_grand_plaza" },
          { key: "asOf", label: "As of date", type: "date", sample: "2026-07-28" },
          { key: "channel", label: "Channel", type: "select", options: channels, sample: "direct" },
        ],
      },
    ],
  },
  extranetProperty: {
    moduleKey: "extranetProperty",
    sections: [
      {
        title: "Property details",
        fields: [
          { key: "propertyCode", label: "Property code", type: "text", required: true, sample: "PROP-GPH-01" },
          { key: "propertyName", label: "Property name", type: "text", required: true, sample: "Grand Plaza Hotel", span: 2 },
          {
            key: "propertyType",
            label: "Property type",
            type: "select",
            options: [
              { value: "hotel", label: "Hotel" },
              { value: "resort", label: "Resort" },
              { value: "villa", label: "Villa" },
              { value: "apartment", label: "Apartment" },
            ],
            sample: "hotel",
          },
          { key: "starRating", label: "Star rating", type: "select", options: starRatings, sample: "5" },
          { key: "city", label: "City", type: "text", sample: "Dubai" },
          { key: "country", label: "Country", type: "text", sample: "UAE" },
        ],
      },
      {
        title: "Content & policies",
        fields: [
          { key: "address", label: "Address", type: "textarea", span: 2, sample: "Dubai Marina Walk, Dubai, UAE" },
          { key: "checkInTime", label: "Check-in time", type: "text", sample: "15:00" },
          { key: "checkOutTime", label: "Check-out time", type: "text", sample: "12:00" },
          { key: "totalRooms", label: "Total rooms", type: "number", sample: "220" },
          { key: "amenities", label: "Amenities", type: "textarea", span: 2, sample: "Pool, spa, gym, free WiFi, airport shuttle" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "live" },
        ],
      },
    ],
  },
  contracts: {
    moduleKey: "contracts",
    sections: [
      {
        title: "Rate contract / agreement",
        fields: [
          { key: "contractNumber", label: "Contract number", type: "text", required: true, sample: "RC-2026-0044" },
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          {
            key: "contractType",
            label: "Contract type",
            type: "select",
            options: [
              { value: "rate", label: "Rate Contract" },
              { value: "allotment", label: "Allotment Agreement" },
              { value: "net_rate", label: "Net Rate Contract" },
              { value: "preferred", label: "Preferred Partner Agreement" },
              { value: "seasonal", label: "Seasonal Contract" },
              { value: "group", label: "Group Booking Contract" },
            ],
            sample: "rate",
          },
          { key: "startDate", label: "Start date", type: "date", sample: "2026-01-01" },
          { key: "endDate", label: "End date", type: "date", sample: "2026-12-31" },
          { key: "commissionPct", label: "Commission %", type: "number", sample: "15" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  extranetInventory: {
    moduleKey: "extranetInventory",
    sections: [
      {
        title: "Room / unit inventory",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "roomType", label: "Room type", type: "text", required: true, sample: "Deluxe Room" },
          { key: "roomCode", label: "Room code", type: "text", sample: "DLX" },
          { key: "maxOccupancy", label: "Max occupancy", type: "number", sample: "3" },
          { key: "totalUnits", label: "Total units", type: "number", sample: "40" },
          {
            key: "bedType",
            label: "Bed type",
            type: "select",
            options: [
              { value: "king", label: "King" },
              { value: "twin", label: "Twin" },
              { value: "queen", label: "Queen" },
            ],
            sample: "king",
          },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "live" },
          { key: "description", label: "Description", type: "textarea", span: 2, sample: "45sqm room with marina view" },
        ],
      },
    ],
  },
  rates: {
    moduleKey: "rates",
    sections: [
      {
        title: "Rate plan",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "roomType", label: "Room type", type: "text", sample: "Deluxe Room" },
          { key: "ratePlanName", label: "Rate plan name", type: "text", required: true, sample: "Best Available Rate", span: 2 },
          {
            key: "rateType",
            label: "Rate type",
            type: "select",
            options: [
              { value: "bar", label: "Best Available Rate" },
              { value: "nonref", label: "Non-Refundable" },
              { value: "corporate", label: "Corporate" },
              { value: "package", label: "Package" },
              { value: "longstay", label: "Long Stay" },
              { value: "earlybird", label: "Early Bird" },
            ],
            sample: "bar",
          },
          { key: "baseRate", label: "Base rate (per night)", type: "number", sample: "420" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          {
            key: "mealPlan",
            label: "Meal plan",
            type: "select",
            options: [
              { value: "ro", label: "Room Only" },
              { value: "bb", label: "Bed & Breakfast" },
              { value: "hb", label: "Half Board" },
              { value: "fb", label: "Full Board" },
              { value: "ai", label: "All Inclusive" },
            ],
            sample: "bb",
          },
          {
            key: "cancellationPolicy",
            label: "Cancellation policy",
            type: "select",
            options: [
              { value: "free", label: "Free cancellation" },
              { value: "24hr", label: "24hr before arrival" },
              { value: "48hr", label: "48hr before arrival" },
              { value: "nonref", label: "Non-refundable" },
            ],
            sample: "24hr",
          },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
        ],
      },
    ],
  },
  extranetAvailability: {
    moduleKey: "extranetAvailability",
    sections: [
      {
        title: "ARI update",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "roomType", label: "Room type", type: "text", sample: "Deluxe Room" },
          { key: "date", label: "Date", type: "date", required: true, sample: "2026-08-10" },
          { key: "availableUnits", label: "Available units", type: "number", sample: "12" },
          { key: "rate", label: "Rate", type: "number", sample: "420" },
          { key: "stopSell", label: "Stop sell", type: "select", options: yesNo, sample: "no" },
          { key: "minLos", label: "Min length of stay", type: "number", sample: "1" },
          { key: "maxLos", label: "Max length of stay", type: "number", sample: "14" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
        ],
      },
    ],
  },
  promotions: {
    moduleKey: "promotions",
    sections: [
      {
        title: "Promotion",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "promoName", label: "Promotion name", type: "text", required: true, sample: "Early Bird 2026", span: 2 },
          {
            key: "promoType",
            label: "Promotion type",
            type: "select",
            options: [
              { value: "earlybird", label: "Early Bird" },
              { value: "lastminute", label: "Last Minute" },
              { value: "staypay", label: "Stay Pay" },
              { value: "package", label: "Package" },
              { value: "seasonal", label: "Seasonal" },
            ],
            sample: "earlybird",
          },
          { key: "discountPct", label: "Discount %", type: "number", sample: "20" },
          { key: "validFrom", label: "Valid from", type: "date", sample: "2026-08-01" },
          { key: "validTo", label: "Valid to", type: "date", sample: "2026-09-30" },
          { key: "minStay", label: "Minimum stay (nights)", type: "number", sample: "2" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
          { key: "terms", label: "Terms & conditions", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  stopSales: {
    moduleKey: "stopSales",
    sections: [
      {
        title: "Stop sale",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "roomType", label: "Room type", type: "text", sample: "Deluxe Room" },
          { key: "startDate", label: "Start date", type: "date", required: true, sample: "2026-08-10" },
          { key: "endDate", label: "End date", type: "date", required: true, sample: "2026-08-15" },
          {
            key: "reason",
            label: "Reason",
            type: "select",
            options: [
              { value: "overbooking", label: "Overbooking" },
              { value: "maintenance", label: "Maintenance" },
              { value: "renovation", label: "Renovation" },
              { value: "soldout", label: "Sold Out" },
              { value: "other", label: "Other" },
            ],
            sample: "soldout",
          },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ],
      },
    ],
  },
  blackoutDates: {
    moduleKey: "blackoutDates",
    sections: [
      {
        title: "Blackout date",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "blackoutName", label: "Blackout name", type: "text", required: true, sample: "New Year's Eve 2026", span: 2 },
          { key: "startDate", label: "Start date", type: "date", required: true, sample: "2026-12-30" },
          { key: "endDate", label: "End date", type: "date", required: true, sample: "2027-01-02" },
          {
            key: "reason",
            label: "Reason",
            type: "select",
            options: [
              { value: "holiday", label: "Public Holiday" },
              { value: "peak", label: "Peak Season" },
              { value: "event", label: "Private Event" },
              { value: "maintenance", label: "Maintenance" },
            ],
            sample: "holiday",
          },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
        ],
      },
    ],
  },
  extranetConnectivity: {
    moduleKey: "extranetConnectivity",
    sections: [
      {
        title: "Channel connection",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "channel", label: "Channel", type: "select", options: channels, required: true, sample: "booking" },
          { key: "channelPropertyId", label: "Channel property ID", type: "text", sample: "BDC-887214" },
          {
            key: "syncStatus",
            label: "Sync status",
            type: "select",
            options: [
              { value: "connected", label: "Connected" },
              { value: "syncing", label: "Syncing" },
              { value: "error", label: "Error" },
              { value: "disconnected", label: "Disconnected" },
            ],
            sample: "connected",
          },
          { key: "lastSyncAt", label: "Last sync", type: "date", sample: "2026-07-28" },
          { key: "commissionPct", label: "Commission %", type: "number", sample: "18" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
        ],
      },
    ],
  },
  extranetReviews: {
    moduleKey: "extranetReviews",
    sections: [
      {
        title: "Guest review",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "guestName", label: "Guest name", type: "text", sample: "J. Thompson" },
          { key: "rating", label: "Rating", type: "select", options: ratingOpts, sample: "5" },
          { key: "reviewDate", label: "Review date", type: "date", sample: "2026-07-20" },
          {
            key: "channel",
            label: "Review source",
            type: "select",
            options: [
              { value: "booking", label: "Booking.com" },
              { value: "google", label: "Google" },
              { value: "tripadvisor", label: "TripAdvisor" },
              { value: "direct", label: "Direct" },
            ],
            sample: "google",
          },
          { key: "comment", label: "Review comment", type: "textarea", span: 2, sample: "Excellent stay, friendly staff, great location." },
          { key: "responded", label: "Responded", type: "select", options: yesNo, sample: "yes" },
          { key: "status", label: "Status", type: "select", options: extranetStatusOpts, sample: "active" },
        ],
      },
    ],
  },
  extranetBookings: {
    moduleKey: "extranetBookings",
    sections: [
      {
        title: "Booking",
        fields: [
          { key: "property", label: "Property", type: "select", options: properties, required: true, sample: "prop_grand_plaza" },
          { key: "guestName", label: "Guest name", type: "text", required: true, sample: "J. Thompson" },
          { key: "checkIn", label: "Check-in date", type: "date", required: true, sample: "2026-08-10" },
          { key: "checkOut", label: "Check-out date", type: "date", required: true, sample: "2026-08-13" },
          { key: "roomType", label: "Room type", type: "text", sample: "Deluxe Room" },
          { key: "channel", label: "Booking channel", type: "select", options: channels, sample: "booking" },
          { key: "totalAmount", label: "Total amount", type: "number", sample: "1260" },
          { key: "currency", label: "Currency", type: "select", options: currencyOpts, sample: "AED" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "confirmed", label: "Confirmed" },
              { value: "pending", label: "Pending" },
              { value: "cancelled", label: "Cancelled" },
              { value: "checked_in", label: "Checked In" },
              { value: "checked_out", label: "Checked Out" },
              { value: "no_show", label: "No Show" },
            ],
            sample: "confirmed",
          },
        ],
      },
    ],
  },
  extranetReports: {
    moduleKey: "extranetReports",
    sections: [
      {
        title: "Report filter (demo)",
        description: "Visual only — export uses the same filters in the live build.",
        fields: [
          {
            key: "reportType",
            label: "Report type",
            type: "select",
            options: [
              { value: "occupancy", label: "Occupancy Report" },
              { value: "revpar", label: "RevPAR Analysis" },
              { value: "channel_perf", label: "Channel Performance" },
              { value: "rate_parity", label: "Rate Parity" },
              { value: "booking_pace", label: "Booking Pace" },
              { value: "review_summary", label: "Guest Review Summary" },
            ],
            sample: "occupancy",
          },
          { key: "property", label: "Property", type: "select", options: properties, sample: "prop_grand_plaza" },
          { key: "fromDate", label: "From date", type: "date", sample: "2026-07-01" },
          { key: "toDate", label: "To date", type: "date", sample: "2026-07-28" },
        ],
      },
    ],
  },
};

export function getPrototypeFormSchema(moduleKey: ModuleKey | string): PrototypeFormSchema | null {
  return FORMS[moduleKey] ?? null;
}

export function sampleValuesFromSchema(schema: PrototypeFormSchema): Record<string, string> {
  const values: Record<string, string> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      values[field.key] = field.sample ?? "";
    }
  }
  return values;
}
