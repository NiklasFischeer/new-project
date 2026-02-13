"""
models.py
---------
Dieses File enthaelt die Datenbank-Struktur (SQLite + SQLAlchemy).
Ein "Lead" ist hier ein Datensatz mit Kontaktinformationen und Versandstatus.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite-Datei fuer die lokale Demo.
# "./outreach.db" bedeutet: die Datei liegt im Projektordner.
DATABASE_URL = "sqlite:///./outreach.db"

# SQLAlchemy-Engine:
# - connect_args ist fuer SQLite noetig, damit FastAPI mit Threads arbeiten kann.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SessionLocal erzeugt pro Request eine eigene DB-Session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Basisklasse fuer alle Tabellen.
Base = declarative_base()


class Lead(Base):
    """
    DB-Tabelle fuer Leads.
    Status-Werte:
    - pending: Lead existiert, aber E-Mail noch nicht versendet.
    - sent: E-Mail wurde versendet.
    - replied: Lead hat geantwortet.
    """

    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)

    # Grunddaten aus CSV
    company = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)

    # Angereicherte Felder
    industry = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    linkedin = Column(String(500), nullable=True)

    # Generierter E-Mail-Text
    generated_email = Column(Text, nullable=True)

    # Tracking-Status: pending | sent | replied
    status = Column(String(50), nullable=False, default="pending", index=True)

    # Timestamps fuer Nachvollziehbarkeit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
