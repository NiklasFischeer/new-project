"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CustomFieldDefinitionRecord, CustomListDefinitionRecord } from "@/lib/types";

type SettingsClientProps = {
  initialCustomFields: CustomFieldDefinitionRecord[];
};

type CustomFieldsResponse = {
  customFields: CustomFieldDefinitionRecord[];
};

type CustomListsResponse = {
  customLists: CustomListDefinitionRecord[];
};

type CustomListScope = CustomListDefinitionRecord["scope"];
type CustomListKind = CustomListDefinitionRecord["kind"];

const scopeLabels: Record<CustomListScope, string> = {
  LEADS: "Leads",
  FUNDING_OUTREACH: "Funding Outreach",
};

const kindLabels: Record<CustomListKind, string> = {
  SINGLE_SELECT: "Single Select",
  MULTI_SELECT: "Multi Select",
  TAGS: "Tags",
};

async function fetchCustomFields(): Promise<CustomFieldDefinitionRecord[]> {
  const response = await fetch("/api/custom-fields", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch custom fields");
  const data = (await response.json()) as CustomFieldsResponse;
  return data.customFields;
}

async function fetchCustomLists(): Promise<CustomListDefinitionRecord[]> {
  const response = await fetch("/api/custom-lists", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch custom lists");
  const data = (await response.json()) as CustomListsResponse;
  return data.customLists;
}

function parseOptionsInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function SettingsClient({ initialCustomFields }: SettingsClientProps) {
  const queryClient = useQueryClient();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldMessage, setFieldMessage] = useState<string | null>(null);

  const [listScope, setListScope] = useState<CustomListScope>("LEADS");
  const [listKind, setListKind] = useState<CustomListKind>("SINGLE_SELECT");
  const [listName, setListName] = useState("");
  const [listOptions, setListOptions] = useState("");
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: fetchCustomFields,
    initialData: initialCustomFields,
  });

  const { data: customLists = [] } = useQuery({
    queryKey: ["custom-lists"],
    queryFn: fetchCustomLists,
  });

  const addCustomFieldMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Feld konnte nicht angelegt werden.");
      }

      const data = (await response.json()) as { customField: CustomFieldDefinitionRecord };
      return data.customField;
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ["custom-fields"] });
      const previous = queryClient.getQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"]);

      const optimistic: CustomFieldDefinitionRecord = {
        id: `temp-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"], (current = []) => [...current, optimistic]);

      return { previous, optimisticId: optimistic.id };
    },
    onError: (error, _name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["custom-fields"], context.previous);
      }
      setFieldMessage(error instanceof Error ? error.message : "Feld konnte nicht angelegt werden.");
    },
    onSuccess: (field, _name, context) => {
      queryClient.setQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"], (current = []) =>
        current.map((item) => (item.id === context?.optimisticId ? field : item)),
      );
      setFieldName("");
      setFieldMessage(`Feld "${field.name}" angelegt.`);
    },
  });

  const deleteCustomFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Feld konnte nicht entfernt werden.");
      }

      return fieldId;
    },
    onMutate: async (fieldId) => {
      await queryClient.cancelQueries({ queryKey: ["custom-fields"] });
      const previous = queryClient.getQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"]);

      queryClient.setQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"], (current = []) =>
        current.filter((field) => field.id !== fieldId),
      );

      return { previous };
    },
    onError: (error, _fieldId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["custom-fields"], context.previous);
      }
      setFieldMessage(error instanceof Error ? error.message : "Feld konnte nicht entfernt werden.");
    },
  });

  const addCustomListMutation = useMutation({
    mutationFn: async (payload: { scope: CustomListScope; kind: CustomListKind; name: string; options: string[] }) => {
      const response = await fetch("/api/custom-lists", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Liste konnte nicht angelegt werden.");
      }

      const data = (await response.json()) as { customList: CustomListDefinitionRecord };
      return data.customList;
    },
    onSuccess: (customList) => {
      queryClient.setQueryData<CustomListDefinitionRecord[]>(["custom-lists"], (current = []) => [
        ...current,
        customList,
      ]);
      setListName("");
      setListOptions("");
      setListMessage(`Liste "${customList.name}" angelegt.`);
    },
    onError: (error) => {
      setListMessage(error instanceof Error ? error.message : "Liste konnte nicht angelegt werden.");
    },
  });

  const updateCustomListMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const response = await fetch(`/api/custom-lists/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Liste konnte nicht aktualisiert werden.");
      }

      const data = (await response.json()) as { customList: CustomListDefinitionRecord };
      return data.customList;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CustomListDefinitionRecord[]>(["custom-lists"], (current = []) =>
        current.map((list) => (list.id === updated.id ? updated : list)),
      );
    },
    onError: (error) => {
      setListMessage(error instanceof Error ? error.message : "Liste konnte nicht aktualisiert werden.");
    },
  });

  const deleteCustomListMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/custom-lists/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Liste konnte nicht gelöscht werden.");
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<CustomListDefinitionRecord[]>(["custom-lists"], (current = []) =>
        current.filter((list) => list.id !== id),
      );
    },
    onError: (error) => {
      setListMessage(error instanceof Error ? error.message : "Liste konnte nicht gelöscht werden.");
    },
  });

  function addCustomField() {
    const name = fieldName.trim();
    if (!name) {
      setFieldMessage("Bitte Feldnamen eingeben.");
      return;
    }

    setFieldMessage(null);
    addCustomFieldMutation.mutate(name);
  }

  function deleteCustomField(fieldId: string) {
    deleteCustomFieldMutation.mutate(fieldId);
  }

  function createCustomList() {
    const name = listName.trim();
    if (!name) {
      setListMessage("Bitte Listenname eingeben.");
      return;
    }

    setListMessage(null);
    addCustomListMutation.mutate({
      scope: listScope,
      kind: listKind,
      name,
      options: parseOptionsInput(listOptions),
    });
  }

  function addOption(list: CustomListDefinitionRecord) {
    const draft = optionDrafts[list.id]?.trim();
    if (!draft) return;

    const nextOptions = Array.from(new Set([...list.options, draft]));
    updateCustomListMutation.mutate({ id: list.id, payload: { options: nextOptions } });
    setOptionDrafts((prev) => ({ ...prev, [list.id]: "" }));
  }

  function removeOption(list: CustomListDefinitionRecord, option: string) {
    const nextOptions = list.options.filter((item) => item !== option);
    updateCustomListMutation.mutate({ id: list.id, payload: { options: nextOptions } });
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
    queryClient.invalidateQueries({ queryKey: ["leads"] });
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
            <Button onClick={addCustomField} disabled={addCustomFieldMutation.isPending}>
              Feld hinzufügen
            </Button>
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
          <CardTitle>Kategorien & Listen</CardTitle>
          <CardDescription>
            Erstelle eigene Listen für Leads oder Funding Outreach, z. B. "Kalender Kategorie", "Eigener Status" oder
            "Deal Tags".
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 rounded-md border border-border/70 p-3 md:grid-cols-4">
            <Select value={listScope} onChange={(event) => setListScope(event.target.value as CustomListScope)}>
              <option value="LEADS">Leads</option>
              <option value="FUNDING_OUTREACH">Funding Outreach</option>
            </Select>
            <Select value={listKind} onChange={(event) => setListKind(event.target.value as CustomListKind)}>
              <option value="SINGLE_SELECT">Single Select</option>
              <option value="MULTI_SELECT">Multi Select</option>
              <option value="TAGS">Tags</option>
            </Select>
            <Input
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              placeholder="Listenname, z. B. Kalender Kategorie"
            />
            <Input
              value={listOptions}
              onChange={(event) => setListOptions(event.target.value)}
              placeholder="Optionen (kommagetrennt), z. B. High, Medium"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={createCustomList} disabled={addCustomListMutation.isPending}>
              Liste hinzufügen
            </Button>
            {listMessage ? <p className="text-sm text-muted-foreground">{listMessage}</p> : null}
          </div>

          <div className="grid gap-3">
            {customLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine benutzerdefinierten Listen vorhanden.</p>
            ) : (
              customLists.map((list) => (
                <div key={list.id} className="grid gap-3 rounded-md border border-border p-3">
                  <div className="grid gap-2 md:grid-cols-4">
                    <Select
                      value={list.scope}
                      onChange={(event) =>
                        updateCustomListMutation.mutate({ id: list.id, payload: { scope: event.target.value } })
                      }
                    >
                      <option value="LEADS">Leads</option>
                      <option value="FUNDING_OUTREACH">Funding Outreach</option>
                    </Select>
                    <Select
                      value={list.kind}
                      onChange={(event) =>
                        updateCustomListMutation.mutate({ id: list.id, payload: { kind: event.target.value } })
                      }
                    >
                      <option value="SINGLE_SELECT">Single Select</option>
                      <option value="MULTI_SELECT">Multi Select</option>
                      <option value="TAGS">Tags</option>
                    </Select>
                    <Input
                      defaultValue={list.name}
                      onBlur={(event) => {
                        const nextName = event.target.value.trim();
                        if (!nextName || nextName === list.name) return;
                        updateCustomListMutation.mutate({ id: list.id, payload: { name: nextName } });
                      }}
                    />
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => deleteCustomListMutation.mutate(list.id)}>
                        Löschen
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Bereich: {scopeLabels[list.scope]}</Badge>
                    <Badge variant="outline">Typ: {kindLabels[list.kind]}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {list.options.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Noch keine Optionen definiert.</p>
                    ) : (
                      list.options.map((option) => (
                        <button
                          key={`${list.id}-${option}`}
                          type="button"
                          onClick={() => removeOption(list, option)}
                          className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                          title="Option entfernen"
                        >
                          {option} ×
                        </button>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={optionDrafts[list.id] ?? ""}
                      onChange={(event) =>
                        setOptionDrafts((prev) => ({
                          ...prev,
                          [list.id]: event.target.value,
                        }))
                      }
                      placeholder="Neue Option"
                      className="max-w-sm"
                    />
                    <Button variant="outline" size="sm" onClick={() => addOption(list)}>
                      Option hinzufügen
                    </Button>
                  </div>
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
