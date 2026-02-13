import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCustomFieldDefinitionModel } from "@/lib/prisma";

export async function GET() {
  const model = getCustomFieldDefinitionModel();
  if (!model) {
    return NextResponse.json({
      customFields: [],
      warning: "Custom fields unavailable until Prisma client/schema is updated.",
    });
  }

  const fields = await model.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({
    customFields: fields.map((field) => ({
      ...field,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const model = getCustomFieldDefinitionModel();
  if (!model) {
    return NextResponse.json(
      { error: "Custom fields unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Field name is required" }, { status: 400 });
  }

  const existing = await model.findMany({
    select: { name: true },
  });
  const exists = (existing as Array<{ name: string }>).some((field) => field.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    return NextResponse.json({ error: "Field already exists" }, { status: 409 });
  }

  try {
    const field = (await model.create({
      data: {
        name,
      },
    })) as { id: string; name: string; createdAt: Date; updatedAt: Date };

    return NextResponse.json(
      {
        customField: {
          ...field,
          createdAt: field.createdAt.toISOString(),
          updatedAt: field.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Field already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create field" }, { status: 500 });
  }
}
