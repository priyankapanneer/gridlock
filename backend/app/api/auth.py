from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme, ALGORITHM, SECRET_KEY
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db, DbUser
import jwt

router = APIRouter()

class UserRegister(BaseModel):
    username: str
    password: str
    role: str
    police_station: Optional[str] = None
    email: str


@router.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(DbUser).filter(DbUser.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = DbUser(
        username=user_data.username,
        password=user_data.password, # Plain text for demo simplicity
        role=user_data.role,
        police_station=user_data.police_station,
        email=user_data.email
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "username": new_user.username}

@router.post("/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(DbUser).filter(DbUser.username == form_data.username).first()
    if not user or user.password != form_data.password:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "police_station": user.police_station},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "police_station": user.police_station,
        "email": user.email
    }


