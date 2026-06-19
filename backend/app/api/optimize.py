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
async def get_transit_recommendations(
    footfall: int = 15000,
    vehicles: int = 6000,
    current_user: TokenData = Depends(get_current_user)
):
    # Dynamic coordinates for lane-1 (ORR) and lane-2 (HAL Airport Road)
    # Default coordinates
    orr_coords = [[77.6739, 12.9245], [77.6811, 12.9284], [77.6928, 12.9368], [77.6986, 12.9464], [77.7006, 12.9694]]
    hal_coords = [[77.6263, 12.9635], [77.6373, 12.9610], [77.6481, 12.9598], [77.6492, 12.9595], [77.6545, 12.9592], [77.6642, 12.9635], [77.6916, 12.9557]]

    # Dynamically generate recommendations based on surge parameters
    suggestions = []
    if vehicles > 5000 or footfall > 12000:
        orr_coords = [[77.6839, 12.9145], [77.6950, 12.9220], [77.7080, 12.9300], [77.7120, 12.9450], [77.7150, 12.9600]]  # Outer Bypass Link Road
        hal_coords = [[77.6545, 12.9592], [77.6530, 12.9450], [77.6510, 12.9320], [77.6580, 12.9250]]  # Wind Tunnel Link
        suggestions = [
            {
                "route_no": "500A (Hebbal - Silk Board)",
                "issue": f"Severe traffic surge ({vehicles} active vehicles on ORR)",
                "reroute_via": "Reroute via Outer Bypass Link Road due to projected corridor breakdown."
            },
            {
                "route_no": "G-4 (Brigade Road - Whitefield)",
                "issue": f"Critical footfall spike ({footfall} transit requests)",
                "reroute_via": "Divert via Wind Tunnel Link; deploy 15-second adaptive green wave offset."
            }
        ]
    elif vehicles > 2000 or footfall > 5000:
        orr_coords = [[77.6749, 12.9235], [77.6821, 12.9274], [77.6938, 12.9358], [77.6996, 12.9454], [77.7016, 12.9684]]  # Service Lane Bypass
        hal_coords = [[77.6642, 12.9635], [77.6620, 12.9750], [77.6600, 12.9860]]  # Suranjan Das Road Link
        suggestions = [
            {
                "route_no": "500A (Hebbal - Silk Board)",
                "issue": f"Moderate spillback: {vehicles} vehicles active",
                "reroute_via": "Divert via Service Lane Bypass"
            },
            {
                "route_no": "G-4 (Brigade Road - Whitefield)",
                "issue": "Sub-arterial slowdown",
                "reroute_via": "Divert via Suranjan Das Road Link"
            }
        ]
    else:
        suggestions = [
            {
                "route_no": "500A (Hebbal - Silk Board)",
                "issue": f"Light flow: traffic stable ({vehicles} vehicles)",
                "reroute_via": "Maintain regular transit path"
            },
            {
                "route_no": "G-4 (Brigade Road - Whitefield)",
                "issue": "Standard transit timetables active",
                "reroute_via": "Maintain regular transit path"
            }
        ]

    return TransitResponse(
        bus_lanes=[
            {
                "id": "lane-1",
                "name": "Outer Ring Road (ORR) Dedicated Lane",
                "active_hours": "17:00 - 22:00",
                "coordinates": orr_coords
            },
            {
                "id": "lane-2",
                "name": "HAL Old Airport Road Bus Corridor",
                "active_hours": "08:00 - 12:00",
                "coordinates": hal_coords
            },
            {
                "id": "lane-3",
                "name": "Hosur Road Express Corridor",
                "active_hours": "07:30 - 21:30",
                "coordinates": [[77.6072, 12.9463], [77.6180, 12.9289], [77.6194, 12.9223], [77.6216, 12.9194], [77.6255, 12.9120], [77.6286, 12.9071], [77.6322, 12.9013], [77.6404, 12.8886], [77.6534, 12.8701]]
            },
            {
                "id": "lane-4",
                "name": "Mysore Road Priority Corridor",
                "active_hours": "08:00 - 20:00",
                "coordinates": [[77.5182, 12.9354], [77.5344, 12.9481], [77.5547, 12.9583], [77.5593, 12.9613], [77.5601, 12.9614], [77.5629, 12.9587], [77.5700, 12.9641], [77.5825, 12.9641], [77.6093, 12.9667]]
            },
            {
                "id": "lane-5",
                "name": "Bellary Road Corridor",
                "active_hours": "07:00 - 22:00",
                "coordinates": [[77.5884, 12.9850], [77.5838, 12.9933], [77.5849, 12.9964], [77.5838, 13.0078], [77.5835, 13.0146], [77.5893, 13.0427], [77.5928, 13.0690], [77.5923, 13.0766], [77.5981, 13.0967], [77.6029, 13.1083], [77.6067, 13.1152], [77.6106, 13.1220], [77.6202, 13.1512]]
            },
            {
                "id": "lane-6",
                "name": "Tumkur Road Corridor",
                "active_hours": "06:00 - 23:00",
                "coordinates": [[77.5640, 13.0153], [77.5538, 13.0177], [77.5440, 13.0264], [77.5357, 13.0311], [77.5223, 13.0379], [77.5181, 13.0400], [77.5147, 13.0424], [77.5070, 13.0451]]
            },
            {
                "id": "lane-7",
                "name": "Old Madras Road Transit Lane",
                "active_hours": "07:00 - 21:00",
                "coordinates": [[77.6014, 12.9741], [77.6009, 12.9766], [77.6057, 12.9786], [77.6185, 12.9727], [77.6257, 12.9753], [77.6272, 12.9774], [77.6285, 12.9784], [77.6460, 12.9863], [77.6499, 12.9880]]
            }
        ],
        rerouting_suggestions=suggestions
    )
