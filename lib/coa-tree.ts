import type { AccountGroup, AccountGroupNature, AccountGroupReportType, Ledger } from "@/types";

export type CoaNodeKind = "group" | "ledger";

/** Flattened / tree node for Chart of Accounts display. */
export interface CoaNode {
  kind: CoaNodeKind;
  id: string;
  code: string;
  name: string;
  nature: AccountGroupNature;
  reportType: AccountGroupReportType;
  normalBalance: "debit" | "credit";
  openingBalance: number;
  status: "active" | "inactive";
  isSystem: boolean;
  depth: number;
  children: CoaNode[];
}

function sortNodes(a: CoaNode, b: CoaNode): number {
  if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
  return a.code.localeCompare(b.code, undefined, { sensitivity: "base" });
}

/**
 * Build hierarchical Chart of Accounts from Account Groups + Ledgers.
 * Groups nest under parent groups; ledgers attach under their groupId.
 */
export function buildChartOfAccounts(
  groups: AccountGroup[],
  ledgers: Ledger[]
): CoaNode[] {
  const groupsByParent = new Map<string | null, AccountGroup[]>();
  for (const g of groups) {
    const key = g.parentId;
    const list = groupsByParent.get(key) ?? [];
    list.push(g);
    groupsByParent.set(key, list);
  }

  const ledgersByGroup = new Map<string, Ledger[]>();
  for (const l of ledgers) {
    const list = ledgersByGroup.get(l.groupId) ?? [];
    list.push(l);
    ledgersByGroup.set(l.groupId, list);
  }

  function buildGroupNode(group: AccountGroup, depth: number): CoaNode {
    const childGroups = (groupsByParent.get(group.id) ?? []).slice().sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
    );
    const childLedgers = (ledgersByGroup.get(group.id) ?? []).slice().sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
    );

    const children: CoaNode[] = [
      ...childGroups.map((g) => buildGroupNode(g, depth + 1)),
      ...childLedgers.map(
        (l): CoaNode => ({
          kind: "ledger",
          id: l.id,
          code: l.code,
          name: l.name,
          nature: group.nature,
          reportType: group.reportType,
          normalBalance: l.openingBalanceType,
          openingBalance: l.openingBalance,
          status: l.status,
          isSystem: l.isSystem,
          depth: depth + 1,
          children: [],
        })
      ),
    ].sort(sortNodes);

    return {
      kind: "group",
      id: group.id,
      code: group.code,
      name: group.name,
      nature: group.nature,
      reportType: group.reportType,
      normalBalance: group.normalBalance,
      openingBalance: 0,
      status: group.status,
      isSystem: group.isSystem,
      depth,
      children,
    };
  }

  const roots = (groupsByParent.get(null) ?? []).slice().sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
  );

  return roots.map((g) => buildGroupNode(g, 0));
}

/** Flatten tree in display order (depth-first). */
export function flattenCoaTree(nodes: CoaNode[]): CoaNode[] {
  const out: CoaNode[] = [];
  function walk(list: CoaNode[]) {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

export function filterCoaTree(
  nodes: CoaNode[],
  opts: {
    search?: string;
    nature?: string;
    reportType?: string;
    activeOnly?: boolean;
  }
): CoaNode[] {
  const term = opts.search?.trim().toLowerCase() ?? "";

  function match(node: CoaNode): boolean {
    if (opts.activeOnly && node.status !== "active") return false;
    if (opts.nature && opts.nature !== "all" && node.nature !== opts.nature) return false;
    if (opts.reportType && opts.reportType !== "all" && node.reportType !== opts.reportType) {
      return false;
    }
    if (!term) return true;
    return (
      node.name.toLowerCase().includes(term) ||
      node.code.toLowerCase().includes(term)
    );
  }

  function filterNodes(list: CoaNode[]): CoaNode[] {
    const result: CoaNode[] = [];
    for (const node of list) {
      const filteredChildren = filterNodes(node.children);
      const selfMatch = match(node);
      if (selfMatch || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
    return result;
  }

  return filterNodes(nodes);
}

export function countCoaNodes(nodes: CoaNode[]): { groups: number; ledgers: number } {
  let groups = 0;
  let ledgers = 0;
  function walk(list: CoaNode[]) {
    for (const n of list) {
      if (n.kind === "group") groups += 1;
      else ledgers += 1;
      walk(n.children);
    }
  }
  walk(nodes);
  return { groups, ledgers };
}
