"use client";

import { PipelineStatus } from "@prisma/client";
import { FormEvent, useState } from "react";
import { CustomFieldDefinitionRecord, LeadWithDrafts } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { pipelineLabels } from "@/lib/constants";

type NewLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customFields: CustomFieldDefinitionRecord[];
  onCreated: (lead: LeadWithDrafts) => void;
};

type NewLeadFormState = {
  companyName: string;
  industry: string;
  sizeEmployees: number;
  digitalMaturity: number;
  mlActivity: boolean;
  mlActivityDescription: string;
  associationMemberships: string;
  dataTypes: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  linkedinUrl: string;
  warmIntroPossible: boolean;
  dataIntensity: number;
  competitivePressure: number;
  coopLikelihood: number;
  status: PipelineStatus;
  nextFollowUpAt: string;
  notes: string;
};

const initialForm: NewLeadFormState = {
  companyName: "",
  industry: "Maschinenbau",
  sizeEmployees: 200,
  digitalMaturity: 1,
  mlActivity: false,
  mlActivityDescription: "",
  associationMemberships: "",
  dataTypes: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  linkedinUrl: "",
  warmIntroPossible: false,
  dataIntensity: 1,
  competitivePressure: 1,
  coopLikelihood: 1,
  status: PipelineStatus.NEW,
  nextFollowUpAt: "",
  notes: "",
};

export function NewLeadDialog({ open, onOpenChange, customFields, onCreated }: NewLeadDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        associationMemberships: form.associationMemberships
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        dataTypes: form.dataTypes
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        customFieldValues: Object.fromEntries(
          Object.entries(customFieldValues).filter(([, value]) => value.trim()),
        ),
        clusterOverride: null,
        lastContactedAt: null,
        nextFollowUpAt: form.nextFollowUpAt ? `${form.nextFollowUpAt}T00:00:00.000Z` : null,
      }),
    });

    setSaving(false);

    if (!response.ok) return;

    const data = (await response.json()) as { lead: LeadWithDrafts };
    onCreated(data.lead);
    setForm(initialForm);
    setCustomFieldValues({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Lead" description="Add a new outreach target">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input
              required
              value={form.companyName}
              onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Input
              required
              value={form.industry}
              onChange={(event) => setForm((prev) => ({ ...prev, industry: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Employees</Label>
            <Input
              type="number"
              min={1}
              value={form.sizeEmployees}
              onChange={(event) => setForm((prev) => ({ ...prev, sizeEmployees: Number(event.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as PipelineStatus }))}
            >
              {Object.entries(pipelineLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact name</Label>
            <Input
              required
              value={form.contactName}
              onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact role</Label>
            <Input
              required
              value={form.contactRole}
              onChange={(event) => setForm((prev) => ({ ...prev, contactRole: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              required
              type="email"
              value={form.contactEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>LinkedIn URL</Label>
            <Input
              type="url"
              value={form.linkedinUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Digital maturity (0-3)</Label>
            <Input
              type="number"
              min={0}
              max={3}
              value={form.digitalMaturity}
              onChange={(event) => setForm((prev) => ({ ...prev, digitalMaturity: Number(event.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data intensity (0-3)</Label>
            <Input
              type="number"
              min={0}
              max={3}
              value={form.dataIntensity}
              onChange={(event) => setForm((prev) => ({ ...prev, dataIntensity: Number(event.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Competitive pressure (0-2)</Label>
            <Input
              type="number"
              min={0}
              max={2}
              value={form.competitivePressure}
              onChange={(event) => setForm((prev) => ({ ...prev, competitivePressure: Number(event.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Coop likelihood (0-2)</Label>
            <Input
              type="number"
              min={0}
              max={2}
              value={form.coopLikelihood}
              onChange={(event) => setForm((prev) => ({ ...prev, coopLikelihood: Number(event.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Association memberships</Label>
            <Input
              value={form.associationMemberships}
              onChange={(event) => setForm((prev) => ({ ...prev, associationMemberships: event.target.value }))}
              placeholder="VDMA, Bitkom"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Data types used</Label>
            <Input
              value={form.dataTypes}
              onChange={(event) => setForm((prev) => ({ ...prev, dataTypes: event.target.value }))}
              placeholder="Sensor data, ERP events, Quality images"
            />
          </div>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1.5 md:col-span-2">
              <Label>{field.name}</Label>
              <Input
                value={customFieldValues[field.name] ?? ""}
                onChange={(event) =>
                  setCustomFieldValues((prev) => ({
                    ...prev,
                    [field.name]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
          <div className="space-y-1.5 md:col-span-2">
            <Label>ML activity description (optional)</Label>
            <Input
              value={form.mlActivityDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, mlActivityDescription: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Next follow-up</Label>
            <Input
              type="date"
              value={form.nextFollowUpAt}
              onChange={(event) => setForm((prev) => ({ ...prev, nextFollowUpAt: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Warm intro possible</Label>
            <Select
              value={form.warmIntroPossible ? "yes" : "no"}
              onChange={(event) => setForm((prev) => ({ ...prev, warmIntroPossible: event.target.value === "yes" }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            Create lead
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
