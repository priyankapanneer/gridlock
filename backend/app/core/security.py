from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.models import TokenData

SECRET_KEY = "resilio_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        police_station: str = payload.get("police_station")
        if username is None or role is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role, police_station=police_station)
    except jwt.PyJWTError:
        raise credentials_exception
    return token_data

async def get_current_active_inspector(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "Field Inspector":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

async def get_current_active_commissioner(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "Command Commissioner":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
