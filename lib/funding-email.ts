import { FundingEmailStyle } from "@prisma/client";

type FundingTemplate = {
  subject: string;
  body: string;
};

const templateLibrary: Record<FundingEmailStyle, FundingTemplate> = {
  SHORT: {
    subject: "Kurzer Intro-Ping: {companyName} x {name}",
    body: `Hi {contactName},

ich melde mich kurz, weil {name} sehr gut zu {companyName} passen könnte.

Wir bauen bei datapool.ml Federated-Learning-Infrastruktur für industrielle B2B-Use-Cases.
Kurz-Thesis: {fitSummary}

Wenn relevant, schicke ich euch gern ein 1-Pager Update.

Beste Grüße
{senderName}`,
  },
  MEDIUM: {
    subject: "Funding Fit: {companyName} für {name}",
    body: `Hi {contactName},

ich wollte mich melden, weil wir bei datapool.ml einen starken Fit mit {name} sehen.

Kontext:
- Zielstage: {targetStage}
- Ticket-Wunsch: {ticketRange}
- Fokus: Federated Learning für industrielle B2B-Workflows

Fit-Hypothese:
{fitSummary}

Wenn es passt, schicke ich euch gerne Deck + kurzes KPI-Update und wir stimmen einen Call ab.

Viele Grüße
{senderName}`,
  },
  TECHNICAL: {
    subject: "Technical fit note: {companyName} x {name}",
    body: `Hello {contactName},

we are building a federated learning platform for cross-company model training without centralizing sensitive data.

Why this might be relevant for {name}:
{fitSummary}

Current stage: {targetStage}
Ticket context: {ticketRange}

Happy to share a concise technical memo (architecture + pilot KPI framework) before a first call.

Best
{senderName}`,
  },
  GRANT: {
    subject: "Förderfit Anfrage: {companyName} für {name}",
    body: `Guten Tag {contactName},

wir prüfen aktuell passende Förderprogramme für datapool.ml und sehen bei {name} potenziellen Fit.

Kurzprofil:
- Stage: {targetStage}
- Fokus: Federated Learning, Industrial AI
- Geografie: {geoFocus}

Relevante Notiz:
{fitSummary}

Falls passend, würden wir gerne die Eligibility/Requirements kurz abstimmen.

Beste Grüße
{senderName}`,
  },
};

export const fundingOutreachTemplates = [
  { key: "SHORT", label: "Kurz" },
  { key: "MEDIUM", label: "Mittel" },
  { key: "TECHNICAL", label: "Technisch" },
  { key: "GRANT", label: "Grant" },
] as const;

export function renderFundingEmail(input: {
  style: FundingEmailStyle;
  name: string;
  companyName: string;
  contactName?: string | null;
  fitSummary: string;
  targetStage: string;
  ticketRange: string;
  geoFocus: string;
  senderName?: string;
}) {
  const template = templateLibrary[input.style];
  const senderName = input.senderName ?? "Niklas";
  const contactName = input.contactName?.trim() || "Team";

  const replaceTokens = (value: string) =>
    value
      .replaceAll("{name}", input.name)
      .replaceAll("{companyName}", input.companyName)
      .replaceAll("{contactName}", contactName)
      .replaceAll("{fitSummary}", input.fitSummary)
      .replaceAll("{targetStage}", input.targetStage)
      .replaceAll("{ticketRange}", input.ticketRange)
      .replaceAll("{geoFocus}", input.geoFocus)
      .replaceAll("{senderName}", senderName);

  return {
    subject: replaceTokens(template.subject),
    body: replaceTokens(template.body),
  };
}
