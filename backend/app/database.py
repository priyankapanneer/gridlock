import os
from sqlalchemy import create_engine, Column, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# Using SQLite for local MVP, easily swappable to PostgreSQL/Supabase
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resilio_traffic.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String, primary_key=True, index=True)
    event_type = Column(String) # 'planned' | 'unplanned'
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String)
    event_cause = Column(String)
    requires_road_closure = Column(Boolean)
    start_datetime = Column(DateTime)
    closed_datetime = Column(DateTime, nullable=True)
    status = Column(String)
    priority = Column(String) # 'High' | 'Low'
    corridor = Column(String)
    police_station = Column(String)
    zone = Column(String)
    description = Column(String)
    veh_type = Column(String)

class DbUser(Base):
    __tablename__ = "users"
    
    username = Column(String, primary_key=True, index=True)
    password = Column(String)
    role = Column(String)
    police_station = Column(String, nullable=True)
    email = Column(String)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# RLS Simulation function
def apply_rls_filter(query, user_role, user_police_station):
    if user_role == "Field Inspector":
        # Simulate RLS filtering by appending condition to query
        return query.filter(Incident.police_station == user_police_station)
    return query # Command Commissioner and Transit Planner have global read
