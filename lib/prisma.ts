import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

type CustomFieldDefinitionModel = {
  findMany: (args?: unknown) => Promise<any[]>;
  upsert: (args: unknown) => Promise<any>;
  create: (args: unknown) => Promise<any>;
  delete: (args: unknown) => Promise<any>;
  findUnique: (args: unknown) => Promise<any>;
};

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export function getCustomFieldDefinitionModel(): CustomFieldDefinitionModel | undefined {
  return (prisma as unknown as { customFieldDefinition?: CustomFieldDefinitionModel }).customFieldDefinition;
}
