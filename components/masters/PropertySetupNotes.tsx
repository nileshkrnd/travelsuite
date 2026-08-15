"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSessionStore } from "@/lib/store/session.store";
import {
  listPropertySetupNotes,
  createPropertySetupNote,
  PropertySetupNotesApiError,
} from "@/lib/services/property-setup-notes.service";
import type { PropertySetupNote } from "@/types";

/** Operational notes/activity log for a property's commercial-readiness setup — persisted, not local. */
export function PropertySetupNotes({
  propertyId,
  tenantId,
  companyId,
}: {
  propertyId: number;
  tenantId: number;
  companyId: number;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const actorKey = sessionUser?.userKey ?? 0;
  const [notes, setNotes] = useState<PropertySetupNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listPropertySetupNotes(propertyId);
      setNotes(rows);
    } catch (error) {
      toast.error(error instanceof PropertySetupNotesApiError ? error.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!actorKey || tenantId <= 0 || companyId <= 0) {
      toast.error("Missing session context — sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      await createPropertySetupNote({ tenantId, companyId, propertyId, note: trimmed, createdBy: actorKey });
      setText("");
      await refresh();
      toast.success("Note added");
    } catch (error) {
      toast.error(error instanceof PropertySetupNotesApiError ? error.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Notes &amp; Activity</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Textarea
              placeholder="Leave an operational note — e.g. “Waiting for hotel to confirm Summer 2026 rates.”"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => void handleAdd()} disabled={submitting || !text.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </Button>
            </div>
          </div>

          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading notes…</p>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              tone="muted"
              heading="No notes yet"
              description="Log operational notes about this property's setup here."
              size="compact"
            />
          ) : (
            <ul className="space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium">{n.createdByName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.note}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
