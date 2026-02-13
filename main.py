"""
main.py
-------
FastAPI-App fuer ein einfaches Business-Outreach-Tool.

Dieses Demo zeigt den kompletten Ablauf:
1) Leads aus CSV importieren
2) Leads anreichern (Branche, Website, LinkedIn)
3) Personalisierte E-Mails aus Vorlage generieren
4) E-Mails per SMTP versenden (oder als Dry-Run pruefen)
"""

from __future__ import annotations

import csv
import io
import re
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models import Base, Lead, SessionLocal, engine

# Erlaubte Lead-Status fuer das Tracking.
ALLOWED_STATUSES = {"pending", "sent", "replied"}

# Standardpfad fuer die E-Mail-Vorlage.
DEFAULT_TEMPLATE_PATH = Path("email_template.txt")

# FastAPI-App mit verstaendlicher Beschreibung fuer die automatische API-Doku.
app = FastAPI(
    title="Business Outreach Tool (FastAPI Demo)",
    description=(
        "Importiert Leads, reichert Firmendaten an, erzeugt personalisierte "
        "E-Mails und versendet sie optional via SMTP."
    ),
    version="1.0.0",
)


@app.on_event("startup")
def startup_event() -> None:
    """
    Beim Start der App werden automatisch alle Tabellen erstellt,
    falls sie noch nicht existieren.
    """
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """
    Oeffnet eine DB-Session pro Request und schliesst sie danach sauber.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class EnrichLeadsRequest(BaseModel):
    """
    Optional kann man nur bestimmte Lead-IDs anreichern.
    Ohne IDs werden alle Leads verarbeitet.
    """

    lead_ids: list[int] | None = None


class GenerateEmailsRequest(BaseModel):
    """
    Optional:
    - eigener Template-Pfad
    - nur bestimmte Lead-IDs verarbeiten
    """

    template_path: str = Field(default=str(DEFAULT_TEMPLATE_PATH))
    lead_ids: list[int] | None = None


class SendEmailsRequest(BaseModel):
    """
    SMTP-Konfiguration plus Versandoptionen.

    dry_run=True:
      - Es wird NICHT wirklich versendet.
      - Nuetzlich zum Testen.
    dry_run=False:
      - E-Mails werden wirklich ueber SMTP versendet.
    """

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_sender: str | None = None
    subject_template: str = "Kurze Idee fuer {company}"
    use_tls: bool = True
    dry_run: bool = True
    lead_ids: list[int] | None = None


class MarkRepliedRequest(BaseModel):
    """
    Hilfs-Endpunkt fuer Status-Tracking:
    Wenn ein Lead antwortet, kann der Status auf "replied" gesetzt werden.
    """

    status: str = "replied"


def slugify_company(company: str) -> str:
    """
    Wandelt Firmennamen in URL-freundlichen "Slug" um.
    Beispiel: "ACME GmbH" -> "acme-gmbh"
    """
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", company).strip("-").lower()
    return slug or "company"


def guess_industry(company: str) -> str:
    """
    Sehr einfache Demo-Heuristik zur Branchen-Erkennung.
    In echter Produktion wuerde man externe Datenquellen nutzen.
    """
    lower = company.lower()
    mapping = {
        "tech": "Technologie",
        "software": "Software",
        "ai": "Kuenstliche Intelligenz",
        "health": "Gesundheitswesen",
        "med": "Gesundheitswesen",
        "fin": "Finanzdienstleistungen",
        "bank": "Finanzdienstleistungen",
        "logistik": "Logistik",
        "retail": "Einzelhandel",
        "consult": "Beratung",
    }
    for keyword, industry in mapping.items():
        if keyword in lower:
            return industry
    return "Unbekannt"


class SafeFormatDict(dict):
    """
    Verhindert KeyError beim Template-Rendern:
    Falls ein Platzhalter fehlt, wird ein gut sichtbarer Fallback genutzt.
    """

    def __missing__(self, key: str) -> str:
        return f"<{key}-fehlt>"


def render_email_template(template_text: str, lead: Lead) -> str:
    """
    Ersetzt Platzhalter wie {company}, {industry}, {name}.
    """
    values = SafeFormatDict(
        company=lead.company,
        industry=lead.industry or "Unbekannt",
        name=lead.name,
        email=lead.email,
        website=lead.website or "Nicht verfuegbar",
        linkedin=lead.linkedin or "Nicht verfuegbar",
    )
    return template_text.format_map(values)


def serialize_lead(lead: Lead) -> dict[str, Any]:
    """
    Hilfsfunktion fuer API-Antworten.
    """
    return {
        "id": lead.id,
        "company": lead.company,
        "name": lead.name,
        "email": lead.email,
        "industry": lead.industry,
        "website": lead.website,
        "linkedin": lead.linkedin,
        "status": lead.status,
    }


@app.get("/")
def healthcheck() -> dict[str, str]:
    """
    Einfacher Healthcheck.
    """
    return {"status": "ok", "message": "Business Outreach Tool API laeuft."}


@app.post("/import_leads")
async def import_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    CSV-Upload und Import in die Datenbank.
    Erwartete Spalten:
    - company
    - name
    - email
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Bitte eine CSV-Datei hochladen.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="CSV konnte nicht als UTF-8 gelesen werden.",
        ) from exc

    reader = csv.DictReader(io.StringIO(text))
    required_columns = {"company", "name", "email"}

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV enthaelt keine Header-Zeile.")

    missing_columns = required_columns - set(reader.fieldnames)
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Fehlende CSV-Spalten: {sorted(missing_columns)}",
        )

    imported = 0
    skipped = 0

    for row in reader:
        company = (row.get("company") or "").strip()
        name = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip()

        # Leere oder unvollstaendige Zeilen ueberspringen.
        if not company or not name or not email:
            skipped += 1
            continue

        lead = Lead(
            company=company,
            name=name,
            email=email,
            status="pending",
        )
        db.add(lead)
        imported += 1

    db.commit()

    return {
        "message": "CSV-Import abgeschlossen.",
        "imported_count": imported,
        "skipped_count": skipped,
    }


@app.post("/enrich_leads")
def enrich_leads(
    request: EnrichLeadsRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Ergaenzt pro Lead fehlende Felder:
    - industry
    - website
    - linkedin
    """
    query = db.query(Lead)
    if request.lead_ids:
        query = query.filter(Lead.id.in_(request.lead_ids))

    leads = query.all()
    if not leads:
        return {"message": "Keine passenden Leads gefunden.", "enriched_count": 0}

    enriched_count = 0

    for lead in leads:
        changed = False

        if not lead.industry:
            lead.industry = guess_industry(lead.company)
            changed = True

        if not lead.website:
            slug = slugify_company(lead.company)
            lead.website = f"https://www.{slug}.com"
            changed = True

        if not lead.linkedin:
            slug = slugify_company(lead.company)
            lead.linkedin = f"https://www.linkedin.com/company/{slug}/"
            changed = True

        # Falls ein historischer Datensatz einen unbekannten Status hat,
        # setzen wir auf einen gueltigen Ausgangsstatus zurueck.
        if lead.status not in ALLOWED_STATUSES:
            lead.status = "pending"
            changed = True

        if changed:
            enriched_count += 1

    db.commit()

    return {
        "message": "Anreicherung abgeschlossen.",
        "enriched_count": enriched_count,
        "total_selected": len(leads),
    }


@app.post("/generate_emails")
def generate_emails(
    request: GenerateEmailsRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Generiert den E-Mail-Text pro Lead anhand einer Textvorlage.
    Unterstuetzte Platzhalter:
    - {company}, {industry}, {name}, {email}, {website}, {linkedin}
    """
    template_path = Path(request.template_path)
    if not template_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Template nicht gefunden: {template_path}",
        )

    template_text = template_path.read_text(encoding="utf-8")

    query = db.query(Lead)
    if request.lead_ids:
        query = query.filter(Lead.id.in_(request.lead_ids))

    leads = query.all()
    if not leads:
        return {"message": "Keine passenden Leads gefunden.", "generated_count": 0}

    generated_count = 0
    preview: list[dict[str, Any]] = []

    for lead in leads:
        lead.generated_email = render_email_template(template_text, lead)
        generated_count += 1

        # Kleine Vorschau fuer schnelle Sichtpruefung.
        if len(preview) < 3:
            preview.append(
                {
                    "lead_id": lead.id,
                    "to": lead.email,
                    "email_preview": lead.generated_email[:220] + "...",
                }
            )

    db.commit()

    return {
        "message": "E-Mail-Texte wurden generiert.",
        "generated_count": generated_count,
        "preview": preview,
    }


@app.post("/send_emails")
def send_emails(
    request: SendEmailsRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Sendet generierte E-Mails via SMTP.
    Wichtige Logik:
    - Nur Leads mit Status "pending" werden versendet.
    - Bei Erfolg wird der Status auf "sent" gesetzt.
    - Mit dry_run=True erfolgt kein echter Versand.
    """
    query = db.query(Lead).filter(
        Lead.generated_email.isnot(None),
        Lead.generated_email != "",
        Lead.status == "pending",
    )
    if request.lead_ids:
        query = query.filter(Lead.id.in_(request.lead_ids))

    leads = query.all()
    if not leads:
        return {"message": "Keine versendbaren Leads gefunden.", "sent_count": 0}

    # Dry-Run liefert nur eine Versandvorschau.
    if request.dry_run:
        return {
            "message": "Dry-Run aktiv: Keine E-Mail wurde real versendet.",
            "sent_count": 0,
            "preview_count": len(leads),
            "preview": [
                {
                    "lead_id": lead.id,
                    "to": lead.email,
                    "subject": request.subject_template.format(company=lead.company),
                }
                for lead in leads[:10]
            ],
        }

    # Fuer echten Versand brauchen wir minimale SMTP-Daten.
    if not request.smtp_host or not request.smtp_sender:
        raise HTTPException(
            status_code=400,
            detail="Fuer echten Versand sind smtp_host und smtp_sender erforderlich.",
        )

    sent_count = 0
    failed: list[dict[str, Any]] = []

    try:
        with smtplib.SMTP(request.smtp_host, request.smtp_port, timeout=20) as server:
            if request.use_tls:
                server.starttls()

            if request.smtp_username and request.smtp_password:
                server.login(request.smtp_username, request.smtp_password)

            for lead in leads:
                try:
                    msg = EmailMessage()
                    msg["Subject"] = request.subject_template.format(company=lead.company)
                    msg["From"] = request.smtp_sender
                    msg["To"] = lead.email
                    msg.set_content(lead.generated_email or "")

                    server.send_message(msg)

                    lead.status = "sent"
                    sent_count += 1
                except Exception as exc:  # noqa: BLE001
                    failed.append(
                        {
                            "lead_id": lead.id,
                            "email": lead.email,
                            "error": str(exc),
                        }
                    )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"SMTP-Verbindung fehlgeschlagen: {exc}",
        ) from exc

    db.commit()

    return {
        "message": "Versand abgeschlossen.",
        "sent_count": sent_count,
        "failed_count": len(failed),
        "failed": failed,
    }


@app.post("/leads/{lead_id}/mark_replied")
def mark_replied(lead_id: int, request: MarkRepliedRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Optionaler Hilfs-Endpunkt:
    Setzt den Lead-Status auf "replied" (oder anderen gueltigen Status).
    """
    status = request.status.strip().lower()
    if status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Ungueltiger Status. Erlaubt: {sorted(ALLOWED_STATUSES)}",
        )

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} nicht gefunden.")

    lead.status = status
    db.commit()
    db.refresh(lead)
    return {"message": "Status aktualisiert.", "lead": serialize_lead(lead)}


@app.get("/leads")
def list_leads(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Gibt alle Leads inkl. Status zurueck.
    """
    leads = db.query(Lead).order_by(Lead.id.asc()).all()
    return {"count": len(leads), "items": [serialize_lead(lead) for lead in leads]}
