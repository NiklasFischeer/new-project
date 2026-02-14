import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default function FundingDirectoryPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Funding Directory</h1>
        <p className="text-sm text-muted-foreground">
          Diese Sektion folgt als nächstes. Aktuell ist Funding Outreach bereits nutzbar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Hier entsteht euer Funding-Verzeichnis mit zentraler Discovery-Liste.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Noch kein Funding Directory"
            description="Nutzt bis dahin Funding Outreach für aktives Deal-Tracking."
            action={
              <Button asChild>
                <Link href="/funding-outreach">Zu Funding Outreach</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
