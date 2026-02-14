"use client";

import { FundingFundType, FundingStage, FundingStatus, FundingTargetStage } from "@prisma/client";
import { FormEvent, useMemo, useState } from "react";
import { fundingFundTypeLabels, fundingStageLabels } from "@/lib/constants";
import { FundingLeadWithDrafts } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type NewFundingLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: FundingLeadWithDrafts) => void;
};

type NewFundingState = {
  name: string;
  fundType: FundingFundType;
  category: string;
  primaryContactName: string;
  primaryContactRole: string;
  contactEmail: string;
  linkedinUrl: string;
  websiteUrl: string;
  targetStage: FundingTargetStage;
  ticketMin: string;
  ticketMax: string;
  currency: string;
  typicalInstrument: string;
  grantDeadline: string;
  grantRequirements: string;
  thesisTags: string;
  industryFocus: string;
  geoFocus: string;
  warmIntroPossible: boolean;
  introPath: string;
  status: FundingStatus;
  nextFollowUpAt: string;
  owner: string;
  sourceText: string;
  sourceUrl: string;
  notes: string;
};

const initialState: NewFundingState = {
  name: "",
  fundType: "VC",
  category: "",
  primaryContactName: "",
  primaryContactRole: "",
  contactEmail: "",
  linkedinUrl: "",
  websiteUrl: "",
  targetStage: "PRE_SEED",
  ticketMin: "",
  ticketMax: "",
  currency: "EUR",
  typicalInstrument: "",
  grantDeadline: "",
  grantRequirements: "",
  thesisTags: "Federated Learning, AI, Industrial",
  industryFocus: "Manufacturing, Energy",
  geoFocus: "DE, AT, EU",
  warmIntroPossible: false,
  introPath: "",
  status: "NEW",
  nextFollowUpAt: "",
  owner: "",
  sourceText: "",
  sourceUrl: "",
  notes: "",
};

function toList(input: string) {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function NewFundingLeadDialog({ open, onOpenChange, onCreated }: NewFundingLeadDialogProps) {
  const [form, setForm] = useState(initialState);
  const [stageFocus, setStageFocus] = useState<FundingStage[]>(["PRE_SEED", "SEED"]);
  const [saving, setSaving] = useState(false);

  const stageOptions = useMemo(() => Object.keys(fundingStageLabels) as FundingStage[], []);

  function toggleStage(stage: FundingStage) {
    setStageFocus((current) => (current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/funding-outreach", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        fundType: form.fundType,
        category: form.category || null,
        primaryContactName: form.primaryContactName || null,
        primaryContactRole: form.primaryContactRole || null,
        contactEmail: form.contactEmail || null,
        linkedinUrl: form.linkedinUrl || null,
        websiteUrl: form.websiteUrl || null,
        stageFocus,
        targetStage: form.targetStage,
        ticketMin: form.ticketMin ? Number(form.ticketMin) : null,
        ticketMax: form.ticketMax ? Number(form.ticketMax) : null,
        currency: form.currency || "EUR",
        typicalInstrument: form.typicalInstrument || null,
        grantDeadline: form.grantDeadline ? `${form.grantDeadline}T00:00:00.000Z` : null,
        grantRequirements: form.grantRequirements || null,
        thesisTags: toList(form.thesisTags),
        industryFocus: toList(form.industryFocus),
        geoFocus: toList(form.geoFocus),
        warmIntroPossible: form.warmIntroPossible,
        introPath: form.introPath || null,
        stageMatch: 0,
        thesisMatch: 0,
        geoMatch: 0,
        ticketMatch: 0,
        status: form.status,
        firstContactedAt: null,
        lastContactedAt: null,
        nextFollowUpAt: form.nextFollowUpAt ? `${form.nextFollowUpAt}T00:00:00.000Z` : null,
        owner: form.owner || null,
        sourceText: form.sourceText || null,
        sourceUrl: form.sourceUrl || null,
        notes: form.notes || null,
      }),
    });

    setSaving(false);
    if (!response.ok) return;

    const data = (await response.json()) as { lead: FundingLeadWithDrafts };
    onCreated(data.lead);
    setForm(initialState);
    setStageFocus(["PRE_SEED", "SEED"]);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Funding Lead hinzufügen"
      description="Neue Funding-Chance für Outreach und Pipeline anlegen"
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input required value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Fund Type *</Label>
            <Select
              required
              value={form.fundType}
              onChange={(event) => setForm((prev) => ({ ...prev, fundType: event.target.value as FundingFundType }))}
            >
              {Object.entries(fundingFundTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kategorie / Region</Label>
            <Input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Target Stage</Label>
            <Select
              value={form.targetStage}
              onChange={(event) => setForm((prev) => ({ ...prev, targetStage: event.target.value as FundingTargetStage }))}
            >
              <option value="PRE_SEED">Pre-Seed</option>
              <option value="SEED">Seed</option>
              <option value="SERIES_A">Series A</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Primary Contact</Label>
            <Input
              value={form.primaryContactName}
              onChange={(event) => setForm((prev) => ({ ...prev, primaryContactName: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rolle</Label>
            <Input
              value={form.primaryContactRole}
              onChange={(event) => setForm((prev) => ({ ...prev, primaryContactRole: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              type="url"
              value={form.websiteUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ticket Min</Label>
            <Input
              type="number"
              value={form.ticketMin}
              onChange={(event) => setForm((prev) => ({ ...prev, ticketMin: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ticket Max</Label>
            <Input
              type="number"
              value={form.ticketMax}
              onChange={(event) => setForm((prev) => ({ ...prev, ticketMax: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Währung</Label>
            <Input value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as FundingStatus }))}>
              <option value="NEW">New</option>
              <option value="RESEARCHED">Researched</option>
              <option value="WARM_INTRO">Warm Intro</option>
              <option value="CONTACTED">Contacted</option>
              <option value="MEETING_BOOKED">Meeting Booked</option>
              <option value="IN_PROCESS_DD">In Process / DD</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Stage Focus (Mehrfachauswahl)</Label>
            <div className="flex flex-wrap gap-2 rounded-md border border-border p-2">
              {stageOptions.map((stage) => {
                const active = stageFocus.includes(stage);
                return (
                  <Button
                    key={stage}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleStage(stage)}
                  >
                    {fundingStageLabels[stage]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Thesis Tags (kommagetrennt)</Label>
            <Input
              value={form.thesisTags}
              onChange={(event) => setForm((prev) => ({ ...prev, thesisTags: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Industry Focus (kommagetrennt)</Label>
            <Input
              value={form.industryFocus}
              onChange={(event) => setForm((prev) => ({ ...prev, industryFocus: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Geo Focus (kommagetrennt)</Label>
            <Input
              value={form.geoFocus}
              onChange={(event) => setForm((prev) => ({ ...prev, geoFocus: event.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nächstes Follow-up</Label>
            <Input
              type="date"
              value={form.nextFollowUpAt}
              onChange={(event) => setForm((prev) => ({ ...prev, nextFollowUpAt: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Warm Intro möglich</Label>
            <Select
              value={form.warmIntroPossible ? "yes" : "no"}
              onChange={(event) => setForm((prev) => ({ ...prev, warmIntroPossible: event.target.value === "yes" }))}
            >
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label>Notizen</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichert..." : "Funding Lead erstellen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
