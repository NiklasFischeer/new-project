"use client";

import {
  ClusterFit,
  FundingEmailStyle,
  FundingFundType,
  FundingReasonLost,
  FundingStatus,
  FundingTargetStage,
} from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fundingOutreachTemplates } from "@/lib/funding-email";
import { calculateFundingFitScore, calculateFundingPriority, deriveFundingFitCluster } from "@/lib/funding-scoring";
import { fundingFundTypeLabels, fundingStageLabels, fundingStatusLabels } from "@/lib/constants";
import { FundingLeadWithDrafts } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { FundingClusterBadge } from "./funding-cluster-badge";
import { FundingFundTypeBadge } from "./funding-fund-type-badge";
import { FundingPriorityBadge } from "./funding-priority-badge";
import { FundingStatusBadge } from "./funding-status-badge";

type FundingDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: FundingLeadWithDrafts | null;
  onLeadUpdated: (lead: FundingLeadWithDrafts) => void;
  onToast?: (tone: "success" | "error" | "info", message: string) => void;
};

type DraftResponse = {
  id: string;
  fundingLeadId: string;
  style: FundingEmailStyle;
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

function toList(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStageList(input: string) {
  const valid = ["IDEA", "PRE_SEED", "SEED", "SERIES_A", "SERIES_B_PLUS", "GROWTH", "ANY"];
  return input
    .split(",")
    .map((item) =>
      item
        .trim()
        .toUpperCase()
        .replaceAll("+", "_PLUS")
        .replaceAll("-", "_")
        .replaceAll(" ", "_"),
    )
    .filter((item): item is (typeof valid)[number] => valid.includes(item));
}

export function FundingDetailDrawer({ open, onOpenChange, lead, onLeadUpdated, onToast }: FundingDetailDrawerProps) {
  const [localLead, setLocalLead] = useState<FundingLeadWithDrafts | null>(lead);
  const [working, setWorking] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [hydratedLeadId, setHydratedLeadId] = useState<string | null>(null);
  const [draftStyle, setDraftStyle] = useState<FundingEmailStyle>("MEDIUM");

  const [stageFocusText, setStageFocusText] = useState("");
  const [thesisTagsText, setThesisTagsText] = useState("");
  const [industryFocusText, setIndustryFocusText] = useState("");
  const [geoFocusText, setGeoFocusText] = useState("");
  const [attachmentsText, setAttachmentsText] = useState("");

  useEffect(() => {
    setLocalLead(lead);
    setStageFocusText((lead?.stageFocus ?? []).join(", "));
    setThesisTagsText((lead?.thesisTags ?? []).join(", "));
    setIndustryFocusText((lead?.industryFocus ?? []).join(", "));
    setGeoFocusText((lead?.geoFocus ?? []).join(", "));
    setAttachmentsText((lead?.attachments ?? []).join(", "));
  }, [lead]);

  useEffect(() => {
    setHydratedLeadId(null);
  }, [lead?.id]);

  useEffect(() => {
    if (!open || !lead?.id) return;
    if (hydratedLeadId === lead.id) return;
    const leadId = lead.id;
    let cancelled = false;

    async function hydrateDetail() {
      setLoadingDetail(true);
      const response = await fetch(`/api/funding-outreach/${leadId}`);
      if (!response.ok) {
        if (!cancelled) {
          setHydratedLeadId(leadId);
          setLoadingDetail(false);
        }
        return;
      }

      const data = (await response.json()) as { lead: FundingLeadWithDrafts };
      if (!cancelled) {
        setLocalLead(data.lead);
        setStageFocusText(data.lead.stageFocus.join(", "));
        setThesisTagsText(data.lead.thesisTags.join(", "));
        setIndustryFocusText(data.lead.industryFocus.join(", "));
        setGeoFocusText(data.lead.geoFocus.join(", "));
        setAttachmentsText(data.lead.attachments.join(", "));
        setHydratedLeadId(leadId);
        setLoadingDetail(false);
        onLeadUpdated(data.lead);
      }
    }

    void hydrateDetail();
    return () => {
      cancelled = true;
    };
  }, [open, lead?.id, hydratedLeadId, onLeadUpdated]);

  const scorePreview = useMemo(() => {
    if (!localLead) return { fitScore: 0, priority: 1 as const, fitCluster: "LOW" as ClusterFit };
    const fitScore = calculateFundingFitScore(localLead);
    const priority = calculateFundingPriority(fitScore);
    const fitCluster = deriveFundingFitCluster(fitScore);
    return { fitScore, priority, fitCluster };
  }, [localLead]);

  if (!localLead) return null;

  async function patchLead(payload: Record<string, unknown>) {
    if (!localLead) return;
    const leadId = localLead.id;

    setWorking(true);
    const response = await fetch(`/api/funding-outreach/${leadId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    setWorking(false);

    if (!response.ok) return;
    const data = (await response.json()) as { lead: FundingLeadWithDrafts };
    setLocalLead(data.lead);
    setStageFocusText(data.lead.stageFocus.join(", "));
    setThesisTagsText(data.lead.thesisTags.join(", "));
    setIndustryFocusText(data.lead.industryFocus.join(", "));
    setGeoFocusText(data.lead.geoFocus.join(", "));
    setAttachmentsText(data.lead.attachments.join(", "));
    onLeadUpdated(data.lead);
  }

  async function onSave() {
    if (!localLead) return;

    await patchLead({
      name: localLead.name,
      fundType: localLead.fundType,
      category: localLead.category,
      primaryContactName: localLead.primaryContactName,
      primaryContactRole: localLead.primaryContactRole,
      contactEmail: localLead.contactEmail,
      linkedinUrl: localLead.linkedinUrl,
      websiteUrl: localLead.websiteUrl,
      stageFocus: toStageList(stageFocusText),
      targetStage: localLead.targetStage,
      ticketMin: localLead.ticketMin,
      ticketMax: localLead.ticketMax,
      currency: localLead.currency,
      typicalInstrument: localLead.typicalInstrument,
      grantDeadline: localLead.grantDeadline,
      grantRequirements: localLead.grantRequirements,
      thesisTags: toList(thesisTagsText),
      industryFocus: toList(industryFocusText),
      geoFocus: toList(geoFocusText),
      warmIntroPossible: localLead.warmIntroPossible,
      introPath: localLead.introPath,
      stageMatch: localLead.stageMatch,
      thesisMatch: localLead.thesisMatch,
      geoMatch: localLead.geoMatch,
      ticketMatch: localLead.ticketMatch,
      fitClusterOverride: localLead.fitClusterOverride,
      status: localLead.status,
      firstContactedAt: localLead.firstContactedAt,
      lastContactedAt: localLead.lastContactedAt,
      nextFollowUpAt: localLead.nextFollowUpAt,
      cadenceStep: localLead.cadenceStep,
      outcomeNotes: localLead.outcomeNotes,
      reasonLost: localLead.reasonLost,
      objections: localLead.objections,
      nextSteps: localLead.nextSteps,
      attachments: toList(attachmentsText),
      owner: localLead.owner,
      sourceText: localLead.sourceText,
      sourceUrl: localLead.sourceUrl,
      lastVerifiedAt: localLead.lastVerifiedAt,
      notes: localLead.notes,
    });
    onToast?.("success", "Funding Lead gespeichert.");
  }

  async function generateEmail() {
    if (!localLead) return;

    setWorking(true);
    const response = await fetch(`/api/funding-outreach/${localLead.id}/email`, {
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
    onToast?.("success", "E-Mail Draft erzeugt.");
  }

  const effectiveCluster = localLead.fitClusterOverride ?? localLead.fitCluster;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={localLead.name}
      description="Funding Lead Profil, Fit Scoring und Outreach-Management"
      side="right"
    >
      <div className="grid gap-5 pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <FundingStatusBadge status={localLead.status} />
          <FundingFundTypeBadge fundType={localLead.fundType} />
          <FundingClusterBadge cluster={effectiveCluster} />
          <FundingPriorityBadge score={scorePreview.fitScore} priority={scorePreview.priority} />
          {localLead.warmIntroPossible ? <span className="text-xs text-emerald-600">Warm Intro möglich</span> : null}
          {loadingDetail ? <p className="text-xs text-muted-foreground">Lade aktuelle Daten...</p> : null}
        </div>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">Identity & Contacts</h3>
            <Button variant="outline" size="sm" asChild>
              <Link href="/funding">Open in Funding Directory</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={localLead.name} onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, name: event.target.value } : prev))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fund Type</Label>
              <Select
                value={localLead.fundType}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, fundType: event.target.value as FundingFundType } : prev))
                }
              >
                {Object.entries(fundingFundTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kategorie</Label>
              <Input
                value={localLead.category ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, category: event.target.value || null } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                value={localLead.owner ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, owner: event.target.value || null } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Contact</Label>
              <Input
                value={localLead.primaryContactName ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, primaryContactName: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Input
                value={localLead.primaryContactRole ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, primaryContactRole: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={localLead.contactEmail ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, contactEmail: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn</Label>
              <Input
                value={localLead.linkedinUrl ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, linkedinUrl: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Website</Label>
              <Input
                value={localLead.websiteUrl ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, websiteUrl: event.target.value || null } : prev))
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Funding Parameter</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Stage Focus (kommagetrennt)</Label>
              <Input value={stageFocusText} onChange={(event) => setStageFocusText(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Stage</Label>
              <Select
                value={localLead.targetStage}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, targetStage: event.target.value as FundingTargetStage } : prev))
                }
              >
                <option value="PRE_SEED">Pre-Seed</option>
                <option value="SEED">Seed</option>
                <option value="SERIES_A">Series A</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instrument</Label>
              <Input
                value={localLead.typicalInstrument ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, typicalInstrument: event.target.value || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket Min</Label>
              <Input
                type="number"
                value={localLead.ticketMin ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, ticketMin: Number(event.target.value) || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket Max</Label>
              <Input
                type="number"
                value={localLead.ticketMax ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, ticketMax: Number(event.target.value) || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Währung</Label>
              <Input
                value={localLead.currency}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, currency: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grant Deadline</Label>
              <Input
                type="date"
                value={toDateInput(localLead.grantDeadline)}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, grantDeadline: fromDateInput(event.target.value) } : prev))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Grant Requirements</Label>
              <Textarea
                value={localLead.grantRequirements ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, grantRequirements: event.target.value || null } : prev))
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Fit & Kontext</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Thesis Tags (kommagetrennt)</Label>
              <Input value={thesisTagsText} onChange={(event) => setThesisTagsText(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Industry Focus (kommagetrennt)</Label>
              <Input value={industryFocusText} onChange={(event) => setIndustryFocusText(event.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Geo Focus (kommagetrennt)</Label>
              <Input value={geoFocusText} onChange={(event) => setGeoFocusText(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Warm Intro</Label>
              <Select
                value={localLead.warmIntroPossible ? "yes" : "no"}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, warmIntroPossible: event.target.value === "yes" } : prev))
                }
              >
                <option value="no">Nein</option>
                <option value="yes">Ja</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Intro Path</Label>
              <Input
                value={localLead.introPath ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, introPath: event.target.value || null } : prev))}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">Fit Scoring Assistant</h3>
            <FundingPriorityBadge score={scorePreview.fitScore} priority={scorePreview.priority} />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Stage Match (0-3)</Label>
              <Slider
                min={0}
                max={3}
                value={localLead.stageMatch}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, stageMatch: value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thesis Match (0-3)</Label>
              <Slider
                min={0}
                max={3}
                value={localLead.thesisMatch}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, thesisMatch: value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Geo Match (0-2)</Label>
              <Slider
                min={0}
                max={2}
                value={localLead.geoMatch}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, geoMatch: value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket Match (0-2)</Label>
              <Slider
                min={0}
                max={2}
                value={localLead.ticketMatch}
                onChange={(value) => setLocalLead((prev) => (prev ? { ...prev, ticketMatch: value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fit Cluster Override</Label>
              <Select
                value={localLead.fitClusterOverride ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) =>
                    prev ? { ...prev, fitClusterOverride: (event.target.value as ClusterFit) || null } : prev,
                  )
                }
              >
                <option value="">Auto</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Outreach</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={localLead.status}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, status: event.target.value as FundingStatus } : prev))}
              >
                {Object.entries(fundingStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cadence Step</Label>
              <Input
                type="number"
                min={0}
                value={localLead.cadenceStep ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, cadenceStep: Number(event.target.value) || null } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>First Contacted</Label>
              <Input
                type="date"
                value={toDateInput(localLead.firstContactedAt)}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, firstContactedAt: fromDateInput(event.target.value) } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Contacted</Label>
              <Input
                type="date"
                value={toDateInput(localLead.lastContactedAt)}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, lastContactedAt: fromDateInput(event.target.value) } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next Follow-up</Label>
              <Input
                type="date"
                value={toDateInput(localLead.nextFollowUpAt)}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, nextFollowUpAt: fromDateInput(event.target.value) } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason Lost</Label>
              <Select
                value={localLead.reasonLost ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) =>
                    prev ? { ...prev, reasonLost: (event.target.value as FundingReasonLost) || null } : prev,
                  )
                }
              >
                <option value="">-</option>
                <option value="NO_FIT">No Fit</option>
                <option value="NOT_NOW">Not Now</option>
                <option value="NO_RESPONSE">No Response</option>
                <option value="REJECTED">Rejected</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Outcome Notes</Label>
              <Textarea
                value={localLead.outcomeNotes ?? ""}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, outcomeNotes: event.target.value || null } : prev))
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Notizen, Objections, Next Steps</h3>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Notizen</Label>
              <Textarea value={localLead.notes ?? ""} onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, notes: event.target.value || null } : prev))} />
            </div>
            <div className="space-y-1.5">
              <Label>Objections</Label>
              <Textarea
                value={localLead.objections ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, objections: event.target.value || null } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next Steps</Label>
              <Textarea
                value={localLead.nextSteps ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, nextSteps: event.target.value || null } : prev))}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Attachments (Placeholder)</h3>
          <p className="text-xs text-muted-foreground">Links oder Dateinamen kommagetrennt hinterlegen. Files folgen im nächsten Schritt.</p>
          <Input value={attachmentsText} onChange={(event) => setAttachmentsText(event.target.value)} />
          <h4 className="mt-3 text-sm font-medium">Change Log (Placeholder)</h4>
          <p className="text-xs text-muted-foreground">Automatisches Änderungsprotokoll folgt. Aktuell: manuelles Speichern pro Update.</p>
        </section>

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">E-Mail Generator</h3>
            <div className="flex gap-2">
              <Select value={draftStyle} onChange={(event) => setDraftStyle(event.target.value as FundingEmailStyle)} className="w-44">
                {fundingOutreachTemplates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.label}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={generateEmail} disabled={working}>
                E-Mail generieren
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {localLead.emailDrafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Drafts vorhanden.</p>
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

        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h3 className="font-display text-base font-semibold">Source & Verification</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input
                value={localLead.sourceText ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, sourceText: event.target.value || null } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source URL</Label>
              <Input
                value={localLead.sourceUrl ?? ""}
                onChange={(event) => setLocalLead((prev) => (prev ? { ...prev, sourceUrl: event.target.value || null } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Verified</Label>
              <Input
                type="date"
                value={toDateInput(localLead.lastVerifiedAt)}
                onChange={(event) =>
                  setLocalLead((prev) => (prev ? { ...prev, lastVerifiedAt: fromDateInput(event.target.value) } : prev))
                }
              />
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-20 mt-4 flex justify-end border-t border-border bg-background/95 pt-4">
          <Button onClick={onSave} disabled={working}>
            Änderungen speichern
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
