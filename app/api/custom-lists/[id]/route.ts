import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCustomListDefinitionModel } from "@/lib/prisma";

const scopes = ["LEADS", "FUNDING_OUTREACH"] as const;
const kinds = ["SINGLE_SELECT", "MULTI_SELECT", "TAGS"] as const;

function isScope(value: unknown): value is (typeof scopes)[number] {
  return typeof value === "string" && scopes.includes(value as (typeof scopes)[number]);
}

function isKind(value: unknown): value is (typeof kinds)[number] {
  return typeof value === "string" && kinds.includes(value as (typeof kinds)[number]);
}

function normalizeOptions(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function toRecord(row: {
  id: string;
  scope: "LEADS" | "FUNDING_OUTREACH";
  kind: "SINGLE_SELECT" | "MULTI_SELECT" | "TAGS";
  name: string;
  options: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type CustomListRow = {
  id: string;
  scope: "LEADS" | "FUNDING_OUTREACH";
  kind: "SINGLE_SELECT" | "MULTI_SELECT" | "TAGS";
  name: string;
  options: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const model = getCustomListDefinitionModel();
  if (!model) {
    return NextResponse.json(
      { error: "Custom list definitions unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  const { id } = await params;
  let existing: CustomListRow | null = null;

  try {
    existing = (await model.findUnique({
      where: { id },
    })) as CustomListRow | null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Custom list table missing. Run prisma migrate deploy." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Liste konnte nicht geladen werden." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Liste nicht gefunden." }, { status: 404 });
  }

  const body = await request.json();
  const current = existing;
  const nextScope = body.scope === undefined ? current.scope : body.scope;
  const nextKind = body.kind === undefined ? current.kind : body.kind;
  const nextName =
    body.name === undefined ? current.name : typeof body.name === "string" ? body.name.trim() : "";
  const nextOptions = normalizeOptions(body.options);

  if (!isScope(nextScope)) {
    return NextResponse.json({ error: "Ungültiger Scope." }, { status: 400 });
  }

  if (!isKind(nextKind)) {
    return NextResponse.json({ error: "Ungültiger Listen-Typ." }, { status: 400 });
  }

  if (!nextName) {
    return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
  }

  let listsInScope: Array<{ id: string; name: string }> = [];

  try {
    listsInScope = (await model.findMany({
      where: { scope: nextScope },
      select: { id: true, name: true },
    })) as Array<{ id: string; name: string }>;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Custom list table missing. Run prisma migrate deploy." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Listen konnten nicht geladen werden." }, { status: 500 });
  }

  const nameTaken = listsInScope.some((row) => row.id !== id && row.name.toLowerCase() === nextName.toLowerCase());
  if (nameTaken) {
    return NextResponse.json({ error: "Eine Liste mit diesem Namen existiert bereits in diesem Bereich." }, { status: 409 });
  }

  try {
    const updated = (await model.update({
      where: { id },
      data: {
        scope: nextScope,
        kind: nextKind,
        name: nextName,
        options: nextOptions === undefined ? undefined : nextOptions,
      },
    })) as {
      id: string;
      scope: "LEADS" | "FUNDING_OUTREACH";
      kind: "SINGLE_SELECT" | "MULTI_SELECT" | "TAGS";
      name: string;
      options: string[];
      createdAt: Date;
      updatedAt: Date;
    };

    return NextResponse.json({ customList: toRecord(updated) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Custom list table missing. Run prisma migrate deploy." },
        { status: 503 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Liste existiert bereits." }, { status: 409 });
    }

    return NextResponse.json({ error: "Liste konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const model = getCustomListDefinitionModel();
  if (!model) {
    return NextResponse.json(
      { error: "Custom list definitions unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  const { id } = await params;

  try {
    await model.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Custom list table missing. Run prisma migrate deploy." },
        { status: 503 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Liste nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ error: "Liste konnte nicht gelöscht werden." }, { status: 500 });
  }
}
