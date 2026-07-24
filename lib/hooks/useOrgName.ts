import { useCompaniesStore } from "@/lib/store/companies.store";
import { useBranchesStore } from "@/lib/store/branches.store";
import { useAgenciesStore } from "@/lib/store/agencies.store";
import { useSubAgenciesStore } from "@/lib/store/subAgencies.store";
import { useCorporatesStore } from "@/lib/store/corporates.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import type { User } from "@/types";

/** Resolves the organization name(s) a user belongs to, across every category. */
export function useOrgName() {
  const companies = useCompaniesStore((s) => s.companies);
  const branches = useBranchesStore((s) => s.branches);
  const agencies = useAgenciesStore((s) => s.agencies);
  const subAgencies = useSubAgenciesStore((s) => s.subAgencies);
  const corporates = useCorporatesStore((s) => s.corporates);
  const suppliers = useSuppliersStore((s) => s.suppliers);

  return (user: User) => {
    if (user.companyId) {
      const company = companies.find((c) => c.id === user.companyId)?.name;
      const branch = branches.find((b) => b.id === user.branchId)?.name;
      return [company, branch].filter(Boolean).join(" · ") || "—";
    }
    if (user.agencyId) return agencies.find((a) => a.id === user.agencyId)?.name ?? "—";
    if (user.subAgencyId) return subAgencies.find((s) => s.id === user.subAgencyId)?.name ?? "—";
    if (user.corporateId) return corporates.find((c) => c.id === user.corporateId)?.name ?? "—";
    if (user.supplierId) return suppliers.find((s) => s.id === user.supplierId)?.name ?? "—";
    return "—";
  };
}
