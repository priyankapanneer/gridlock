from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IncidentBase(BaseModel):
    id: str
    event_type: str
    latitude: float
    longitude: float
    address: str
    event_cause: str
    requires_road_closure: bool
    start_datetime: datetime
    closed_datetime: Optional[datetime] = None
    status: str
    priority: str
    corridor: str
    police_station: str
    zone: str
    description: str
    veh_type: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentResponse(IncidentBase):
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str
    role: str
    police_station: Optional[str] = None

class PrescriptiveResponse(BaseModel):
    officers_needed: int
    barricades_needed: int
    bypass_routes: list[str]

class PredictionResponse(BaseModel):
    eta_minutes: float
    shap_values: dict[str, float]
