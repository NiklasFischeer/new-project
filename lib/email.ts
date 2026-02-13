export type OutreachStyle = "SHORT" | "MEDIUM" | "TECHNICAL";

const templateLibrary: Record<OutreachStyle, { subject: string; body: string }> = {
  SHORT: {
    subject: "Federated Learning idea for {companyName}",
    body: `Hi {contactName},

I noticed {companyName} is active in {industry}. We help teams launch federated learning pilots without sharing sensitive plant data.

Based on your context, a first step could be: {useCaseSummary}.

Would you be open to a 20-minute exchange next week?

Best,
{senderName}`,
  },
  MEDIUM: {
    subject: "Pilot concept: privacy-preserving ML for {companyName}",
    body: `Hi {contactName},

I am reaching out because {companyName} appears to be a strong candidate for federated learning in {industry}.

Hypothesis:
{hypothesis}

Our team supports Mittelstand companies in validating FL value with a pragmatic pilot plan, governance setup, and measurable business KPI targets.

If relevant, I can share a pilot blueprint tailored to your setup.

Would Tuesday or Thursday work for a short call?

Best regards,
{senderName}`,
  },
  TECHNICAL: {
    subject: "Technical FL pilot blueprint for {companyName}",
    body: `Hello {contactName},

We are building FL infrastructure for B2B operators that need cross-site learning while preserving local data control.

For {companyName}, a practical pilot in {industry} could center on {useCaseSummary}. The setup can be phased:
1) data readiness + feature contract,
2) local training nodes,
3) secure aggregation + evaluation,
4) KPI readout for pilot-go decision.

Key reason this is relevant:
{hypothesis}

If useful, I can send a one-page architecture draft before a technical intro call.

Regards,
{senderName}`,
  },
};

export const outreachTemplates = [
  { key: "SHORT", label: "Short" },
  { key: "MEDIUM", label: "Medium" },
  { key: "TECHNICAL", label: "Technical" },
] as const;

export function extractUseCaseSummary(hypothesis: string): string {
  const marker = "Likely use case:";
  const idx = hypothesis.indexOf(marker);
  if (idx === -1) return "a federated anomaly and forecasting pilot";

  const tail = hypothesis.slice(idx + marker.length).trim();
  const stopIdx = tail.indexOf("Potential partners:");
  const summary = stopIdx === -1 ? tail : tail.slice(0, stopIdx);
  return summary.trim().replace(/\.$/, "");
}

export function renderOutreachEmail(input: {
  style: OutreachStyle;
  companyName: string;
  industry: string;
  contactName: string;
  hypothesis: string;
  senderName?: string;
}) {
  const senderName = input.senderName ?? "Your Name";
  const useCaseSummary = extractUseCaseSummary(input.hypothesis);

  const template = templateLibrary[input.style];

  const replaceTokens = (value: string) =>
    value
      .replaceAll("{companyName}", input.companyName)
      .replaceAll("{industry}", input.industry)
      .replaceAll("{contactName}", input.contactName)
      .replaceAll("{hypothesis}", input.hypothesis)
      .replaceAll("{useCaseSummary}", useCaseSummary)
      .replaceAll("{senderName}", senderName);

  return {
    subject: replaceTokens(template.subject),
    body: replaceTokens(template.body),
  };
}
