from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, Incident
from app.models import PrescriptiveResponse, TokenData
from app.core.security import get_current_user

router = APIRouter()

@router.get("/{incident_id}/optimize", response_model=PrescriptiveResponse)
async def optimize_resources(incident_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """
    Simulates Google OR-Tools routing and resource allocation.
    Returns prescriptive payloads based on incident parameters.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Base allocation
    officers = 2
    barricades = 0
    bypass_routes = []

    if incident.priority == "High":
        officers += 4
        barricades += 10
    else:
        officers += 1

    if incident.requires_road_closure:
        barricades += 15
        officers += 2
        # Network flow simulation for bypass
        # In a real OR-Tools setup, this would run a Min-Cost Max-Flow algorithm
        # across the adjacency matrix of corridors. Here we mock it based on the corridor.
        bypass_routes = [
            f"Divert North via {incident.corridor} Service Road",
            f"Divert South via Adjacent Zone {incident.zone} Arterial"
        ]

    if incident.veh_type == "Heavy":
        officers += 2 # Need traffic control for heavy recovery

    return PrescriptiveResponse(
        officers_needed=officers,
        barricades_needed=barricades,
        bypass_routes=bypass_routes
    )
