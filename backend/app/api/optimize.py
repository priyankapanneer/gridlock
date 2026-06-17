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

from pydantic import BaseModel
from typing import List, Dict

class SimulateRequest(BaseModel):
    coordinates: List[List[float]]
    footfall: int
    vehicles: int

class SimulationResponse(BaseModel):
    impact_level: str
    predicted_spillback_minutes: int
    bottleneck_nodes: List[Dict]

class TransitResponse(BaseModel):
    bus_lanes: List[Dict]
    rerouting_suggestions: List[Dict]

@router.post("/simulate", response_model=SimulationResponse)
async def simulate_scenario(req: SimulateRequest, current_user: TokenData = Depends(get_current_user)):
    # Simple mathematical twin simulation based on surge inputs
    surge_multiplier = (req.footfall / 10000.0) + (req.vehicles / 5000.0)
    spillback = int(15 * surge_multiplier)
    
    impact = "Low"
    if spillback > 40:
        impact = "Critical"
    elif spillback > 20:
        impact = "Moderate"
        
    # Generate mock bottleneck nodes inside the polygon (or center area)
    bottlenecks = []
    if req.coordinates:
        # Calculate approximate center
        lats = [c[1] for c in req.coordinates]
        lngs = [c[0] for c in req.coordinates]
        center_lat = sum(lats) / len(lats)
        center_lng = sum(lngs) / len(lngs)
        
        # Output 3 simulated bottleneck intersections nearby
        bottlenecks = [
            {"name": "Metro Feeder Junction A", "lat": center_lat + 0.002, "lng": center_lng - 0.001, "spillback_probability": 85},
            {"name": "Arterial Link Crossing", "lat": center_lat - 0.001, "lng": center_lng + 0.003, "spillback_probability": 68},
            {"name": "BMTC Transit Hub Exit", "lat": center_lat + 0.004, "lng": center_lng + 0.001, "spillback_probability": 74}
        ]
        
    return SimulationResponse(
        impact_level=impact,
        predicted_spillback_minutes=max(10, spillback),
        bottleneck_nodes=bottlenecks
    )

@router.get("/transit/multi-modal", response_model=TransitResponse)
async def get_transit_recommendations(current_user: TokenData = Depends(get_current_user)):
    # Hardcoded premium lanes/rerouting recommendations matching Bengaluru area
    return TransitResponse(
        bus_lanes=[
            {
                "id": "lane-1",
                "name": "Outer Ring Road (ORR) Dedicated Lane",
                "active_hours": "17:00 - 22:00",
                "coordinates": [[77.62, 12.935], [77.63, 12.955], [77.64, 12.975]]
            },
            {
                "id": "lane-2",
                "name": "HAL Old Airport Road Bus Corridor",
                "active_hours": "08:00 - 12:00",
                "coordinates": [[77.59, 12.97], [77.61, 12.96], [77.63, 12.95]]
            }
        ],
        rerouting_suggestions=[
            {
                "route_no": "500A (Hebbal - Silk Board)",
                "issue": "High spillback near Yelahanka / Marathahalli",
                "reroute_via": "Divert via Outer Bypass Bypass Link road"
            },
            {
                "route_no": "G-4 (Brigade Road - Whitefield)",
                "issue": "Heavy congestion cluster near HAL road",
                "reroute_via": "Divert via Wind Tunnel Road link"
            }
        ]
    )
