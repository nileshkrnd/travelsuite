import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Voucher, VoucherKind, VoucherLine, VoucherStatus } from "@/types";
import { VOUCHER_KIND_CONFIGS } from "@/types";
import { vouchers as seedVouchers } from "@/mock/data/vouchers";
import { useTenantStore } from "@/lib/store/tenant.store";

function buildLines(
  kind: VoucherKind,
  partyLedgerId: string,
  accountLedgerId: string,
  amount: number,
  narration: string
): VoucherLine[] {
  const mode = VOUCHER_KIND_CONFIGS[kind].entryMode;
  const n = narration.trim();

  if (mode === "partyDrAccountCr") {
    return [
      { id: "ln1", ledgerId: partyLedgerId, debit: amount, credit: 0, narration: n },
      { id: "ln2", ledgerId: accountLedgerId, debit: 0, credit: amount, narration: n },
    ];
  }

  if (mode === "accountDrPartyCr") {
    return [
      { id: "ln1", ledgerId: accountLedgerId, debit: amount, credit: 0, narration: n },
      { id: "ln2", ledgerId: partyLedgerId, debit: 0, credit: amount, narration: n },
    ];
  }

  // contra: To (account) Dr, From (party) Cr
  return [
    { id: "ln1", ledgerId: accountLedgerId, debit: amount, credit: 0, narration: n },
    { id: "ln2", ledgerId: partyLedgerId, debit: 0, credit: amount, narration: n },
  ];
}

function nextVoucherNo(existing: Voucher[], kind: VoucherKind, tenantId: string): string {
  const prefix = VOUCHER_KIND_CONFIGS[kind].prefix;
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 1000;
  for (const v of existing) {
    if (v.tenantId !== tenantId || v.kind !== kind) continue;
    const m = v.voucherNo.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}`;
}

function resolveLines(input: VoucherWriteInput): VoucherLine[] {
  if (VOUCHER_KIND_CONFIGS[input.kind].entryMode === "journal") {
    return (input.lines ?? []).map((ln, i) => ({
      id: ln.id || `ln_${i + 1}`,
      ledgerId: ln.ledgerId,
      debit: ln.debit,
      credit: ln.credit,
      narration: ln.narration?.trim() ?? "",
    }));
  }
  return buildLines(
    input.kind,
    input.partyLedgerId ?? "",
    input.accountLedgerId ?? "",
    input.amount,
    input.narration
  );
}

export type VoucherWriteInput = {
  kind: VoucherKind;
  date: string;
  partyLedgerId: string | null;
  accountLedgerId: string | null;
  costCenterId: string | null;
  departmentId: string | null;
  amount: number;
  narration: string;
  referenceNo: string;
  status: VoucherStatus;
  voucherNo?: string;
  /** Required for journal vouchers (balanced multi-line). */
  lines?: VoucherLine[];
};

interface VouchersState {
  vouchers: Voucher[];
  addVoucher: (input: VoucherWriteInput) => Voucher;
  updateVoucher: (id: string, input: VoucherWriteInput) => void;
  setVoucherStatus: (id: string, status: VoucherStatus) => void;
  deleteVoucher: (id: string) => boolean;
}

export const useVouchersStore = create<VouchersState>()(
  persist(
    (set, get) => ({
      vouchers: seedVouchers,

      addVoucher: (input) => {
        const tenantId = useTenantStore.getState().tenantId;
        const now = new Date().toISOString();
        const voucherNo =
          input.voucherNo?.trim() ||
          nextVoucherNo(get().vouchers, input.kind, tenantId);
        const lines = resolveLines(input);
        const voucher: Voucher = {
          id: `vch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          tenantId,
          kind: input.kind,
          voucherNo,
          date: input.date,
          partyLedgerId: input.partyLedgerId,
          accountLedgerId: input.accountLedgerId,
          costCenterId: input.costCenterId,
          departmentId: input.departmentId,
          narration: input.narration.trim(),
          referenceNo: input.referenceNo.trim(),
          status: input.status,
          amount: input.amount,
          lines,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ vouchers: [voucher, ...state.vouchers] }));
        return voucher;
      },

      updateVoucher: (id, input) => {
        set((state) => ({
          vouchers: state.vouchers.map((v) => {
            if (v.id !== id) return v;
            const lines = resolveLines(input);
            return {
              ...v,
              date: input.date,
              partyLedgerId: input.partyLedgerId,
              accountLedgerId: input.accountLedgerId,
              costCenterId: input.costCenterId,
              departmentId: input.departmentId,
              narration: input.narration.trim(),
              referenceNo: input.referenceNo.trim(),
              status: input.status,
              amount: input.amount,
              voucherNo: input.voucherNo?.trim() || v.voucherNo,
              lines,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setVoucherStatus: (id, status) => {
        set((state) => ({
          vouchers: state.vouchers.map((v) =>
            v.id === id ? { ...v, status, updatedAt: new Date().toISOString() } : v
          ),
        }));
      },

      deleteVoucher: (id) => {
        const target = get().vouchers.find((v) => v.id === id);
        if (!target) return false;
        if (target.status === "posted") return false;
        set((state) => ({ vouchers: state.vouchers.filter((v) => v.id !== id) }));
        return true;
      },
    }),
    {
      name: "travelsuite.vouchers",
      version: 3,
      migrate: () => ({ vouchers: seedVouchers }),
    }
  )
);
