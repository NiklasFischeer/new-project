"use client";

import { ClusterFit, EmailStyle, PipelineStatus } from "@prisma/client";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { outreachTemplates } from "@/lib/email";
import { calculatePriorityLabel, calculatePriorityScore } from "@/lib/scoring";
import { CustomFieldDefinitionRecord, LeadWithDrafts } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ClusterBadge } from "./cluster-badge";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";
import { pipelineLabels } from "@/lib/constants";

type LeadDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithDrafts | null;
  customFields: CustomFieldDefinitionRecord[];
  onCustomFieldsChanged: (fields: CustomFieldDefinitionRecord[]) => void;
  onLeadUpdated: (lead: LeadWithDrafts) => void;
};

type DraftResponse = {
  id: string;
  leadId: string;
  style: EmailStyle;
  subject: string;
  body: string;
  createdAt: string;
};

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function fromDateInput(value: string) {
  return value ? `${value}T00:00:00.000Z` : null;
}

export function LeadDetailDrawer({
  open,
  onOpenChange,
  lead,
  customFields,
  onCustomFieldsChanged,
  onLeadUpdated,
}: LeadDetailDrawerProps) {
  const [draftStyle, setDraftStyle] = useState<EmailStyle>("MEDIUM");
  const [working, setWorking] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [localLead, setLocalLead] = useState<LeadWithDrafts | null>(lead);
  const [associationText, setAssociationText] = useState("");
  const [dataTypeText, setDataTypeText] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  const [hydratedLeadId, setHydratedLeadId] = useState<string | null>(null);

  useEffect(() => {
    setLocalLead(lead);
    setAssociationText((lead?.associationMemberships ?? []).join(", "));
    setDataTypeText((lead?.dataTypes ?? []).join(", "));
  }, [lead]);

  useEffect(() => {
    setHydratedLeadId(null);
  }, [lead?.id]);

  useEffect(() => {
    if (!open || !lead?.id) return;
    if (hydratedLeadId === lead.id) return;
    const leadId = lead.id;

    let cancelled = false;

    async function hydrateLeadDetail() {
      setLoadingDetail(true);
      const response = await fetch(`/api/leads/${leadId}`);

      if (!response.ok) {
        if (!cancelled) {
          setHydratedLeadId(leadId);
          setLoadingDetail(false);
        }
        return;
      }

      const data = (await response.json()) as { lead: LeadWithDrafts };

      if (!cancelled) {
        setLocalLead(data.lead);
        setAssociationText(data.lead.associationMemberships.join(", "));
        setDataTypeText(data.lead.dataTypes.join(", "));
        setHydratedLeadId(leadId);
        setLoadingDetail(false);
        onLeadUpdated(data.lead);
      }
    }

    void hydrateLeadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, lead?.id, hydratedLeadId]);

  const scorePreview = useMemo(() => {
    if (!localLead) return { score: 0, label: 1 as const };
    const score = calculatePriorityScore({
      digitalMaturity: localLead.digitalMaturity,
      dataIntensity: localLead.dataIntensity,
      competitivePressure: localLead.competitivePressure,
      coopLikelihood: localLead.coopLikelihood,
    });
    const label = calculatePriorityLabel(score);
    return { score, label };
  }, [localLead]);

  if (!localLead) {
    return null;
  }

  async function patchLead(payload: Record<string, unknown>) {
    if (!localLead) return;
    setWorking(true);

    const response = await fetch(`/api/leads/${localLead.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setWorking(false);

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { lead: LeadWithDrafts };
    setLocalLead(data.lead);
    setAssociationText(data.lead.associationMemberships.join(", "));
    setDataTypeText(data.lead.dataTypes.join(", "));
    onLeadUpdated(data.lead);
  }

  async function onSave() {
    if (!localLead) return;
    await patchLead({
      companyName: localLead.companyName,
      industry: localLead.industry,
      sizeEmployees: localLead.sizeEmployees,
      digitalMaturity: localLead.digitalMaturity,
      mlActivity: localLead.mlActivity,
      mlActivityDescription: localLead.mlActivityDescription,
      associationMemberships: associationText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      dataTypes: dataTypeText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      customFieldValues: localLead.customFieldValues,
      contactName: localLead.contactName,
      contactRole: localLead.contactRole,
      contactEmail: localLead.contactEmail,
      linkedinUrl: localLead.linkedinUrl,
      warmIntroPossible: localLead.warmIntroPossible,
      dataIntensity: localLead.dataIntensity,
      competitivePressure: localLead.competitivePressure,
      coopLikelihood: localLead.coopLikelihood,
      status: localLead.status,
      clusterOverride: localLead.clusterOverride,
      lastContactedAt: localLead.lastContactedAt,
      nextFollowUpAt: localLead.nextFollowUpAt,
      notes: localLead.notes,
    });
  }

  async function addCustomField() {
    if (!localLead) return;
    const name = newFieldName.trim();
    if (!name) return;

    const response = await fetch("/api/custom-fields", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (response.status === 409) {
      const existing = customFields.find((field) => field.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        setLocalLead((prev) =>
          prev
            ? {
                ...prev,
                customFieldValues: {
                  ...prev.customFieldValues,
                  [existing.name]: prev.customFieldValues[existing.name] ?? "",
                },
              }
            : prev,
        );
      }
      setNewFieldName("");
      return;
    }

    if (!response.ok) return;

    const data = (await response.json()) as { customField: CustomFieldDefinitionRecord };
    onCustomFieldsChanged([...customFields, data.customField]);
    setLocalLead((prev) =>
      prev
        ? {
            ...prev,
            customFieldValues: {
              ...prev.customFieldValues,
              [data.customField.name]: prev.customFieldValues[data.customField.name] ?? "",
            },
          }
        : prev,
    );
    setNewFieldName("");
  }

  async function regenerateHypothesis() {
    if (!localLead) return;
    setWorking(true);
    const response = await fetch(`/api/leads/${localLead.id}/hypothesis`, {
      method: "POST",
    });

    setWorking(false);

    if (!response.ok) return;

    const data = (await response.json()) as { lead: LeadWithDrafts };
    setLocalLead(data.lead);
    onLeadUpdated(data.lead);
  }

  async function generateEmail() {
    if (!localLead) return;
    setWorking(true);
    const response = await fetch(`/api/leads/${localLead.id}/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ style: draftStyle }),
    });

    setWorking(false);

    if (!response.ok) return;

    const data = (await response.json()) as { draft: DraftResponse };
    const updated = {
      ...localLead,
      emailDrafts: [data.draft, ...localLead.emailDrafts],
    };
    setLocalLead(updated);
    onLeadUpdated(updated);
  }

  const effectiveCluster = localLead.clusterOverride ?? localLead.industryCluster;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={localLead.companyName}
      description="Lead profile, scoring assistant, and outreach drafts"
      side="right"
    >
      <div className="grid gap-5 pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={localLead.status} />
          <ClusterBadge cluster={effectiveCluster} />
          <PriorityBadge score={scorePreview.score} label={scorePreview.label} />
          {loadingDetail ? <p className="text-xs text-muted-foreground">Loading latest details...</p> : null}
        </div>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Lead basics</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={localLead.companyName}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, companyName: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input
                value={localLead.industry}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, industry: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Employees</Label>
              <Input
                type="number"
                min={1}
                value={localLead.sizeEmployees}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, sizeEmployees: Number(event.target.value) || 1 } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={localLead.status}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, status: event.target.value as PipelineStatus } : prev))
                }
              >
                {Object.entries(pipelineLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Contacts & network</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contact name</Label>
              <Input
                value={localLead.contactName}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, contactName: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input
                value={localLead.contactRole}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, contactRole: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={localLead.contactEmail}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, contactEmail: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input
                value={localLead.linkedinUrl ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, linkedinUrl: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Association memberships (comma separated)</Label>
              <Input value={associationText} onChange={(event) => setAssociationText(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Data types used (comma separated)</Label>
              <Input
                value={dataTypeText}
                onChange={(event) => setDataTypeText(event.target.value)}
                placeholder="Sensor data, ERP events, Quality images"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">Custom fields</h3>
            <div className="flex gap-2">
              <Input
                value={newFieldName}
                onChange={(event) => setNewFieldName(event.target.value)}
                placeholder="New field"
                className="h-9 w-44"
              />
              <Button size="sm" variant="outline" onClick={addCustomField}>
                Add field
              </Button>
            </div>
          </div>
          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields defined yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label>{field.name}</Label>
                  <Input
                    value={localLead.customFieldValues[field.name] ?? ""}
                    onChange={(event) =>
                      setLocalLead((prev) =>
                        prev
                          ? {
                              ...prev,
                              customFieldValues: {
                                ...prev.customFieldValues,
                                [field.name]: event.target.value,
                              },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">Lead scoring assistant</h3>
            <PriorityBadge score={scorePreview.score} label={scorePreview.label} />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Digital maturity (0-3)</Label>
              <Slider
                min={0}
                max={3}
                value={localLead.digitalMaturity}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, digitalMaturity: value } : prev))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data intensity (0-3)</Label>
              <Slider
                min={0}
                max={3}
                value={localLead.dataIntensity}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, dataIntensity: value } : prev))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Competitive pressure (0-2)</Label>
              <Slider
                min={0}
                max={2}
                value={localLead.competitivePressure}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, competitivePressure: value } : prev))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Coop likelihood (0-2)</Label>
              <Slider
                min={0}
                max={2}
                value={localLead.coopLikelihood}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, coopLikelihood: value } : prev))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cluster override</Label>
                <Select
                  value={localLead.clusterOverride ?? ""}
                  onChange={(event) =>
                    setLocalLead((prev) =>
                      prev
                        ? {
                            ...prev,
                            clusterOverride: event.target.value ? (event.target.value as ClusterFit) : null,
                          }
                        : prev,
                    )
                  }
                >
                  <option value="">Auto</option>
                  <option value="HIGH">High fit</option>
                  <option value="MEDIUM">Medium fit</option>
                  <option value="LOW">Low fit</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ML activity</Label>
                <Select
                  value={localLead.mlActivity ? "yes" : "no"}
                  onChange={(event) =>
                    setLocalLead((prev) => (prev ? { ...prev, mlActivity: event.target.value === "yes" } : prev))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Hypothesis generator</h3>
            <Button size="sm" variant="outline" onClick={regenerateHypothesis} disabled={working}>
              Regenerate
            </Button>
          </div>
          <Textarea
            value={localLead.hypothesis}
            onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, hypothesis: event.target.value } : prev))}
          />
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Follow-up & notes</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Last contacted</Label>
              <Input
                type="date"
                value={toDateInput(localLead.lastContactedAt)}
                onChange={(event) =>
                  setLocalLead((prev) =>
                    prev
                      ? {
                          ...prev,
                          lastContactedAt: fromDateInput(event.target.value),
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next follow-up</Label>
              <Input
                type="date"
                value={toDateInput(localLead.nextFollowUpAt)}
                onChange={(event) =>
                  setLocalLead((prev) =>
                    prev
                      ? {
                          ...prev,
                          nextFollowUpAt: fromDateInput(event.target.value),
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={localLead.notes ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">Outreach templates</h3>
            <div className="flex items-center gap-2">
              <Select value={draftStyle} onChange={(event) => setDraftStyle(event.target.value as EmailStyle)}>
                {outreachTemplates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={generateEmail} disabled={working}>
                Generate Email
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {localLead.emailDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email drafts yet. Generate one to start outreach faster.</p>
            ) : (
              localLead.emailDrafts.map((draft) => (
                <div key={draft.id} className="rounded-md border border-border/80 p-3">
                  <p className="text-xs text-muted-foreground">
                    {draft.style} · {format(new Date(draft.createdAt), "dd MMM yyyy, HH:mm")}
                  </p>
                  <p className="mt-1 font-medium">{draft.subject}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{draft.body}</pre>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="sticky bottom-0 z-20 mt-4 flex justify-end border-t border-border bg-background/95 pt-4">
          <Button onClick={onSave} disabled={working}>
            Save changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
