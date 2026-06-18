from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import io
import csv
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

from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    officers_deployed: int
    barricades_deployed: int

class FeedbackResponse(BaseModel):
    speed_drop_kmh: int
    escalated: bool
    recommended_detour: str

@router.get("/proxy-alerts")
async def get_proxy_alerts(current_user: TokenData = Depends(get_current_user)):
    return {
        "weather": {
            "condition": "Heavy Rain",
            "intensity_mm_hr": 24.5,
            "impact": "Waterlogging warning at Silk Board & Wind Tunnel Road"
        },
        "anomalies": [
            {
                "id": "anom-1",
                "source": "Google Maps Speed Index",
                "title": "Severe Delay: Outer Ring Road Northbound",
                "details": "+18m traffic delay spike detected near Marathahalli flyover",
                "time": "5m ago"
            },
            {
                "id": "anom-2",
                "source": "Social Scraping (Telegram)",
                "title": "VIP Movement / Rally Alert",
                "details": "Telegram traffic group flags assembly forming near Cubbon Park gate",
                "time": "12m ago"
            }
        ]
    }

@router.post("/{incident_id}/feedback", response_model=FeedbackResponse)
async def report_resource_deployment(incident_id: str, req: FeedbackRequest, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    # Simulate a speed drop metric: if fewer resources deployed than standard
    # or just simulate speed drop feedback loop.
    speed_drop = 18 if req.barricades_deployed < 10 else 6
    escalated = req.barricades_deployed < 8
    
    detour = "Standard Level 1 detour via corridor service road"
    if escalated:
        detour = "Level 2 detour activated: Route heavy traffic via outer circumferential bypass"
        
    return FeedbackResponse(
        speed_drop_kmh=speed_drop,
        escalated=escalated,
        recommended_detour=detour
    )

@router.get("/export/csv")
async def export_incidents_csv(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    query = db.query(Incident)
    query = apply_rls_filter(query, current_user.role, current_user.police_station)
    incidents = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "ID", "Description", "Status", "Priority", "Latitude", "Longitude",
        "Corridor", "Zone", "Event Type", "Event Cause", "Veh Type",
        "Requires Road Closure", "Police Station", "Start Datetime"
    ])
    
    for inc in incidents:
        writer.writerow([
            inc.id, inc.description, inc.status, inc.priority, inc.latitude, inc.longitude,
            inc.corridor, inc.zone, inc.event_type, inc.event_cause, inc.veh_type,
            "Yes" if inc.requires_road_closure else "No", inc.police_station,
            inc.start_datetime
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incident_logs.csv"}
    )
