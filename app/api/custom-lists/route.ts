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

function normalizeOptions(value: unknown): string[] {
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

export async function GET() {
  const model = getCustomListDefinitionModel();
  if (!model) {
    return NextResponse.json({
      customLists: [],
      warning: "Custom list definitions unavailable until Prisma client/schema is updated.",
    });
  }

  let lists: Array<{
    id: string;
    scope: "LEADS" | "FUNDING_OUTREACH";
    kind: "SINGLE_SELECT" | "MULTI_SELECT" | "TAGS";
    name: string;
    options: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  try {
    lists = (await model.findMany({
      orderBy: [{ scope: "asc" }, { createdAt: "asc" }],
    })) as typeof lists;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json({
        customLists: [],
        warning: "Custom list table missing. Run prisma migrate deploy.",
      });
    }

    return NextResponse.json({ error: "Custom lists konnten nicht geladen werden." }, { status: 500 });
  }

  return NextResponse.json({
    customLists: lists.map(toRecord),
  });
}

export async function POST(request: NextRequest) {
  const model = getCustomListDefinitionModel();
  if (!model) {
    return NextResponse.json(
      { error: "Custom list definitions unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const scope = body.scope;
  const kind = body.kind;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const options = normalizeOptions(body.options);

  if (!isScope(scope)) {
    return NextResponse.json({ error: "Scope is required (LEADS or FUNDING_OUTREACH)." }, { status: 400 });
  }

  if (!isKind(kind)) {
    return NextResponse.json({ error: "Kind is required (SINGLE_SELECT, MULTI_SELECT or TAGS)." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const existing = (await model.findMany({
    where: { scope },
    select: { name: true },
  })) as Array<{ name: string }>;

  const exists = existing.some((item) => item.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return NextResponse.json({ error: "Eine Liste mit diesem Namen existiert bereits für diesen Bereich." }, { status: 409 });
  }

  try {
    const created = (await model.create({
      data: {
        scope,
        kind,
        name,
        options,
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

    return NextResponse.json({ customList: toRecord(created) }, { status: 201 });
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

    return NextResponse.json({ error: "Liste konnte nicht erstellt werden." }, { status: 500 });
  }
}
