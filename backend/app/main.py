from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal, Incident, DbUser
from app.api import auth, incidents, predict, optimize
from datetime import datetime, timedelta

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resilio-Traffic API", version="1.0.0")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(predict.router, prefix="/api", tags=["predict"])
app.include_router(optimize.router, prefix="/api", tags=["optimize"])

@app.on_event("startup")
async def startup_event():
    # Initialize dummy data if empty
    db = SessionLocal()
    
    # Seed default users
    if db.query(DbUser).count() == 0:
        print("Seeding default users...")
        db.add_all([
            DbUser(username="commissioner1", password="password", role="Command Commissioner", email="commissioner@resilio.gov", police_station=None),
            DbUser(username="inspector1", password="password", role="Field Inspector", email="inspector@resilio.gov", police_station="HAL Old Airport"),
            DbUser(username="planner1", password="password", role="Transit Planner", email="planner@resilio.gov", police_station=None)
        ])
        db.commit()

    if db.query(Incident).count() == 0:
        print("Populating initial data from dataset...")
        import pandas as pd
        import os
        dataset_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
        try:
            df = pd.read_csv(dataset_path)
            # Only take the first 2000 rows to keep the UI snappy for the MVP
            df = df.head(2000)
            dummy_incidents = []
            for _, row in df.iterrows():
                dummy_incidents.append(Incident(
                    id=str(row['id']),
                    event_type=str(row['event_type']) if pd.notna(row['event_type']) else "unplanned",
                    latitude=float(row['latitude']),
                    longitude=float(row['longitude']),
                    address=str(row['address']) if pd.notna(row['address']) else "Unknown",
                    event_cause=str(row['event_cause']) if pd.notna(row['event_cause']) else "unknown",
                    requires_road_closure=bool(row['requires_road_closure']),
                    start_datetime=pd.to_datetime(row['start_datetime']).to_pydatetime() if pd.notna(row['start_datetime']) else datetime.utcnow(),
                    status="active",
                    priority=str(row['priority']) if pd.notna(row['priority']) else "Low",
                    corridor=str(row['corridor']) if pd.notna(row['corridor']) else "Unknown",
                    police_station=str(row['police_station']) if pd.notna(row['police_station']) else "Unknown",
                    zone=str(row['zone']) if pd.notna(row['zone']) else "Unknown",
                    description=str(row['description']) if pd.notna(row['description']) else "",
                    veh_type=str(row['veh_type']) if pd.notna(row['veh_type']) else None
                ))
            db.add_all(dummy_incidents)
            db.commit()
            print("Successfully loaded dataset rows into database.")
        except Exception as e:
            print(f"Error loading CSV: {e}")
    db.close()

@app.get("/health")
def health_check():
    return {"status": "ok"}
