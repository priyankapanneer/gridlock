from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, Incident, apply_rls_filter
from app.models import IncidentResponse, IncidentCreate, TokenData
from app.core.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[IncidentResponse])
async def get_incidents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    query = db.query(Incident)
    
    # Simulate Row Level Security (RLS)
    query = apply_rls_filter(query, current_user.role, current_user.police_station)
    
    incidents = query.offset(skip).limit(limit).all()
    return incidents

@router.post("/", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    # Command Commissioner can create globally, Field Inspector only in their jurisdiction
    if current_user.role == "Field Inspector" and incident.police_station != current_user.police_station:
        raise HTTPException(status_code=403, detail="Cannot create incident outside jurisdiction")
        
    db_incident = Incident(**incident.model_dump())
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

@router.put("/{incident_id}/status", response_model=IncidentResponse)
async def update_incident_status(incident_id: str, status: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    query = db.query(Incident).filter(Incident.id == incident_id)
    query = apply_rls_filter(query, current_user.role, current_user.police_station)
    
    db_incident = query.first()
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found or access denied")
        
    db_incident.status = status
    db.commit()
    db.refresh(db_incident)
    return db_incident
