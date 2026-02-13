import { getCustomFieldDefinitions } from "@/lib/server";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const customFields = await getCustomFieldDefinitions();

  return (
    <SettingsClient
      initialCustomFields={customFields.map((field) => ({
        ...field,
        createdAt: field.createdAt.toISOString(),
        updatedAt: field.updatedAt.toISOString(),
      }))}
    />
  );
}
