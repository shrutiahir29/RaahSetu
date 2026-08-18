from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas_db import User

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class UserRegisterSchema(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Citizen"

class UserLoginSchema(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(data: UserRegisterSchema, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already registered")
        
    new_user = User(
        email=data.email,
        hashed_password=data.password, # For demo, direct storing or simple hash
        full_name=data.full_name,
        role_id=1 if data.role.lower() == "admin" else 2
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": "User registered successfully",
        "user": {"id": new_user.id, "email": new_user.email, "full_name": new_user.full_name, "role": data.role}
    }

@router.post("/login")
def login(data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.hashed_password != data.password:
        # Fallback demo login for fast testing
        if data.email == "admin@nagpur.gov.in" and data.password == "admin123":
            return {
                "access_token": "token_nagpur_admin_12345",
                "token_type": "bearer",
                "user": {"id": 1, "email": "admin@nagpur.gov.in", "full_name": "Nagpur Traffic Administrator", "role": "Admin"}
            }
        elif data.email == "user@nagpur.com" and data.password == "user123":
            return {
                "access_token": "token_nagpur_user_67890",
                "token_type": "bearer",
                "user": {"id": 2, "email": "user@nagpur.com", "full_name": "Nagpur Commuter", "role": "Citizen"}
            }
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    role_str = "Admin" if user.role_id == 1 else "Citizen"
    return {
        "access_token": f"token_{user.id}_authenticated",
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": role_str}
    }
