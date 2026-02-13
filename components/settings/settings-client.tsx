"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomFieldDefinitionRecord } from "@/lib/types";

type SettingsClientProps = {
  initialCustomFields: CustomFieldDefinitionRecord[];
};

export function SettingsClient({ initialCustomFields }: SettingsClientProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRecord[]>(initialCustomFields);
  const [fieldMessage, setFieldMessage] = useState<string | null>(null);

  async function addCustomField() {
    const name = fieldName.trim();
    if (!name) {
      setFieldMessage("Bitte Feldnamen eingeben.");
      return;
    }

    const response = await fetch("/api/custom-fields", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setFieldMessage(data.error ?? "Feld konnte nicht angelegt werden.");
      return;
    }

    const data = (await response.json()) as { customField: CustomFieldDefinitionRecord };
    setCustomFields((prev) => [...prev, data.customField]);
    setFieldName("");
    setFieldMessage(`Feld "${data.customField.name}" angelegt.`);
  }

  async function deleteCustomField(fieldId: string) {
    const response = await fetch(`/api/custom-fields/${fieldId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;
    setCustomFields((prev) => prev.filter((field) => field.id !== fieldId));
  }

  async function importCsv() {
    if (!csvFile) {
      setMessage("Please select a CSV file first.");
      return;
    }

    setImporting(true);
    setMessage(null);

    const csv = await csvFile.text();

    const response = await fetch("/api/leads/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ csv }),
    });

    setImporting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error ?? "Import failed");
      return;
    }

    const data = (await response.json()) as { imported: number };
    setMessage(`Imported ${data.imported} lead(s).`);
    setCsvFile(null);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Theme, data exchange, and local admin settings.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Switch between light and dark mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>CSV import</CardTitle>
            <CardDescription>Upload lead records from your existing spreadsheet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
            <div className="flex items-center gap-2">
              <Button onClick={importCsv} disabled={importing}>
                {importing ? "Importing..." : "Import CSV"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/api/leads/export">Download template/export</Link>
              </Button>
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eigene Felder</CardTitle>
          <CardDescription>
            Definiere zusätzliche Lead-Felder, z. B. Datenverantwortlicher, ERP-System oder Buying Trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={fieldName}
              onChange={(event) => setFieldName(event.target.value)}
              placeholder="Neues Feld, z. B. Data Owner"
            />
            <Button onClick={addCustomField}>Feld hinzufügen</Button>
          </div>
          {fieldMessage ? <p className="text-sm text-muted-foreground">{fieldMessage}</p> : null}
          <div className="grid gap-2">
            {customFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine eigenen Felder vorhanden.</p>
            ) : (
              customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{field.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteCustomField(field.id)}>
                    Entfernen
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Export complete or filtered lead lists for sharing and backup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/api/leads/export">Export all leads</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/leads/export?status=NEW">Export new leads</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/leads/export?cluster=HIGH">Export high-fit cluster</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
