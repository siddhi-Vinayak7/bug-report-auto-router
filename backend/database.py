import os
from pathlib import Path
import dotenv
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func

# Load .env file from project root or backend
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

# Load environment variables
dotenv.load_dotenv(PROJECT_DIR / ".env")
dotenv.load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_text = Column(Text, nullable=False)
    predicted_module = Column(String(255), nullable=False)
    predicted_severity = Column(String(255), nullable=False)
    module_confidence = Column(Float, nullable=False)
    severity_confidence = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    corrections = relationship("Correction", back_populates="report", cascade="all, delete-orphan")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    original_module = Column(String(255), nullable=False)
    corrected_module = Column(String(255), nullable=True)
    original_severity = Column(String(255), nullable=False)
    corrected_severity = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("Report", back_populates="corrections")


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
