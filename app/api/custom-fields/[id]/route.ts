import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCustomFieldDefinitionModel, prisma } from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = getCustomFieldDefinitionModel();

  if (!model) {
    return NextResponse.json(
      { error: "Custom fields unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  try {
    const field = (await model.findUnique({
      where: { id },
    })) as { id: string; name: string } | null;

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        customFieldValues: true,
      },
    });

    await Promise.all(
      leads.map(async (lead) => {
        if (!lead.customFieldValues || typeof lead.customFieldValues !== "object" || Array.isArray(lead.customFieldValues)) {
          return;
        }

        const values = { ...(lead.customFieldValues as Record<string, unknown>) };
        if (!(field.name in values)) return;

        delete values[field.name];

        await prisma.lead.update({
          where: { id: lead.id },
          data: { customFieldValues: values as Prisma.InputJsonValue },
        });
      }),
    );

    await model.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Unable to delete field" }, { status: 500 });
  }
}
