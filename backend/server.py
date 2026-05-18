"""
Virtual Study Rooms MVP - FastAPI backend
Provides: Emergent Google Auth, rooms CRUD, chat, tasks, pomodoro state,
stats/leaderboard, AI recommendations (Claude Sonnet 4.5 via Emergent LLM key).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import logging
import httpx

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Mongo
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("study-rooms")

app = FastAPI(title="Virtual Study Rooms API")
api = APIRouter(prefix="/api")

EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = ""
    interests: List[str] = []
    created_at: datetime

class RoomBase(BaseModel):
    name: str
    description: Optional[str] = ""
    subject: str
    category: Literal["subject", "exam", "skill", "goal"] = "subject"
    tags: List[str] = []
    is_private: bool = False
    passcode: Optional[str] = None
    max_participants: int = 12

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    room_id: str
    host_id: str
    host_name: str
    created_at: datetime
    participants: List[dict] = []
    pomodoro: dict = {}

class MessageIn(BaseModel):
    text: str

class TaskIn(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    title: Optional[str] = None

class StatusUpdate(BaseModel):
    status: Literal["studying", "break", "doubt"]

class PomodoroAction(BaseModel):
    action: Literal["start", "pause", "reset", "skip"]
    mode: Optional[Literal["focus", "short_break", "long_break"]] = None
    duration_seconds: Optional[int] = None

class SessionLog(BaseModel):
    minutes: int
    room_id: Optional[str] = None

class AIRecommendRequest(BaseModel):
    interests: Optional[List[str]] = None
    goal: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


async def get_current_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> dict:
    """Validate session via cookie or Authorization Bearer header."""
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = sess.get("expires_at")
    if not expires_at:
        raise HTTPException(status_code=401, detail="Session expired")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def room_doc_to_room(doc: dict) -> dict:
    doc = {k: v for k, v in doc.items() if k != "_id"}
    doc.pop("passcode", None)
    return doc


def default_pomodoro() -> dict:
    return {
        "mode": "focus",  # focus | short_break | long_break
        "duration_seconds": 25 * 60,
        "started_at": None,  # iso string or None
        "paused_remaining": 25 * 60,
        "is_running": False,
        "rounds_completed": 0,
    }


# ---------- Auth ----------
@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            logger.warning("Emergent auth failure: %s %s", r.status_code, r.text)
            raise HTTPException(status_code=401, detail="OAuth verification failed")
        data = r.json()

    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "bio": "",
            "interests": [],
            "created_at": iso(now_utc()),
            "total_minutes": 0,
            "streak_days": 0,
            "last_study_date": None,
        })

    expires = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": iso(expires),
        "created_at": iso(now_utc()),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def auth_logout(response: Response, request: Request, session_token: Optional[str] = Cookie(default=None)):
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.put("/users/me")
async def update_me(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return doc


# ---------- Rooms ----------
@api.get("/rooms")
async def list_rooms(
    subject: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    show_private: bool = False,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if not show_private:
        query["is_private"] = False
    if subject:
        query["subject"] = subject
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    cur = db.rooms.find(query, {"_id": 0, "passcode": 0}).sort("created_at", -1).limit(100)
    rooms = await cur.to_list(100)
    return rooms


@api.post("/rooms")
async def create_room(payload: RoomCreate, user: dict = Depends(get_current_user)):
    room_id = f"room_{uuid.uuid4().hex[:10]}"
    doc = {
        "room_id": room_id,
        "host_id": user["user_id"],
        "host_name": user["name"],
        "name": payload.name,
        "description": payload.description or "",
        "subject": payload.subject,
        "category": payload.category,
        "tags": payload.tags,
        "is_private": payload.is_private,
        "passcode": payload.passcode if payload.is_private else None,
        "max_participants": payload.max_participants,
        "created_at": iso(now_utc()),
        "participants": [],
        "pomodoro": default_pomodoro(),
    }
    await db.rooms.insert_one(doc)
    return await room_doc_to_room(doc)


@api.get("/rooms/{room_id}")
async def get_room(room_id: str, user: dict = Depends(get_current_user)):
    doc = await db.rooms.find_one({"room_id": room_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Room not found")
    has_access = (not doc.get("is_private")) or any(
        p["user_id"] == user["user_id"] for p in doc.get("participants", [])
    ) or doc.get("host_id") == user["user_id"]
    doc.pop("passcode", None)
    if not has_access:
        # Allow basic info but flag for passcode entry
        return {"requires_passcode": True, "room_id": room_id, "name": doc["name"], "is_private": True}
    return doc


@api.post("/rooms/{room_id}/join")
async def join_room(room_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = {}
    try:
        body = await request.json()
    except Exception:
        body = {}
    passcode = body.get("passcode")

    doc = await db.rooms.find_one({"room_id": room_id})
    if not doc:
        raise HTTPException(404, "Room not found")
    if doc.get("is_private") and doc.get("passcode") and passcode != doc["passcode"]:
        if doc.get("host_id") != user["user_id"]:
            raise HTTPException(403, "Invalid passcode")

    participants = doc.get("participants", [])
    if not any(p["user_id"] == user["user_id"] for p in participants):
        if len(participants) >= doc.get("max_participants", 12):
            raise HTTPException(400, "Room is full")
        participants.append({
            "user_id": user["user_id"],
            "name": user["name"],
            "picture": user.get("picture"),
            "status": "studying",
            "joined_at": iso(now_utc()),
        })
        await db.rooms.update_one({"room_id": room_id}, {"$set": {"participants": participants}})

    doc = await db.rooms.find_one({"room_id": room_id}, {"_id": 0, "passcode": 0})
    return doc


@api.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, user: dict = Depends(get_current_user)):
    doc = await db.rooms.find_one({"room_id": room_id})
    if not doc:
        raise HTTPException(404, "Room not found")
    participants = [p for p in doc.get("participants", []) if p["user_id"] != user["user_id"]]
    await db.rooms.update_one({"room_id": room_id}, {"$set": {"participants": participants}})
    return {"ok": True}


@api.put("/rooms/{room_id}/status")
async def set_status(room_id: str, payload: StatusUpdate, user: dict = Depends(get_current_user)):
    doc = await db.rooms.find_one({"room_id": room_id})
    if not doc:
        raise HTTPException(404, "Room not found")
    updated = False
    participants = doc.get("participants", [])
    for p in participants:
        if p["user_id"] == user["user_id"]:
            p["status"] = payload.status
            updated = True
    if not updated:
        raise HTTPException(400, "User not in room")
    await db.rooms.update_one({"room_id": room_id}, {"$set": {"participants": participants}})
    return {"ok": True, "status": payload.status}


# ---------- Pomodoro ----------
@api.post("/rooms/{room_id}/pomodoro")
async def pomodoro_action(room_id: str, payload: PomodoroAction, user: dict = Depends(get_current_user)):
    doc = await db.rooms.find_one({"room_id": room_id})
    if not doc:
        raise HTTPException(404, "Room not found")
    if doc["host_id"] != user["user_id"]:
        raise HTTPException(403, "Only host can control timer")

    pomo = doc.get("pomodoro", default_pomodoro())
    action = payload.action

    def remaining_from(p):
        if p["is_running"] and p.get("started_at"):
            started = datetime.fromisoformat(p["started_at"])
            elapsed = (now_utc() - started).total_seconds()
            return max(0, p["paused_remaining"] - int(elapsed))
        return p["paused_remaining"]

    if action == "start":
        if payload.mode and payload.mode != pomo.get("mode"):
            pomo["mode"] = payload.mode
            durations = {"focus": 25 * 60, "short_break": 5 * 60, "long_break": 15 * 60}
            pomo["duration_seconds"] = payload.duration_seconds or durations[payload.mode]
            pomo["paused_remaining"] = pomo["duration_seconds"]
        if payload.duration_seconds and not payload.mode:
            pomo["duration_seconds"] = payload.duration_seconds
            pomo["paused_remaining"] = payload.duration_seconds
        pomo["started_at"] = iso(now_utc())
        pomo["is_running"] = True
    elif action == "pause":
        pomo["paused_remaining"] = remaining_from(pomo)
        pomo["is_running"] = False
        pomo["started_at"] = None
    elif action == "reset":
        pomo["is_running"] = False
        pomo["started_at"] = None
        pomo["paused_remaining"] = pomo["duration_seconds"]
    elif action == "skip":
        # advance to next mode
        order = {"focus": "short_break", "short_break": "focus", "long_break": "focus"}
        next_mode = order.get(pomo.get("mode", "focus"), "focus")
        if pomo.get("mode") == "focus":
            pomo["rounds_completed"] = pomo.get("rounds_completed", 0) + 1
            if pomo["rounds_completed"] % 4 == 0:
                next_mode = "long_break"
        pomo["mode"] = next_mode
        durations = {"focus": 25 * 60, "short_break": 5 * 60, "long_break": 15 * 60}
        pomo["duration_seconds"] = durations[next_mode]
        pomo["paused_remaining"] = pomo["duration_seconds"]
        pomo["is_running"] = False
        pomo["started_at"] = None

    await db.rooms.update_one({"room_id": room_id}, {"$set": {"pomodoro": pomo}})
    return pomo


# ---------- Chat ----------
@api.get("/rooms/{room_id}/messages")
async def list_messages(room_id: str, after: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"room_id": room_id}
    if after:
        query["created_at"] = {"$gt": after}
    cur = db.messages.find(query, {"_id": 0}).sort("created_at", 1).limit(200)
    msgs = await cur.to_list(200)
    return msgs


@api.post("/rooms/{room_id}/messages")
async def post_message(room_id: str, payload: MessageIn, user: dict = Depends(get_current_user)):
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:10]}",
        "room_id": room_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "text": payload.text,
        "created_at": iso(now_utc()),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


# ---------- Tasks ----------
@api.get("/rooms/{room_id}/tasks")
async def list_tasks(room_id: str, user: dict = Depends(get_current_user)):
    cur = db.tasks.find({"room_id": room_id}, {"_id": 0}).sort("created_at", 1)
    return await cur.to_list(200)


@api.post("/rooms/{room_id}/tasks")
async def add_task(room_id: str, payload: TaskIn, user: dict = Depends(get_current_user)):
    task = {
        "task_id": f"task_{uuid.uuid4().hex[:10]}",
        "room_id": room_id,
        "title": payload.title,
        "completed": False,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": iso(now_utc()),
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)
    return task


@api.patch("/rooms/{room_id}/tasks/{task_id}")
async def update_task(room_id: str, task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    await db.tasks.update_one({"task_id": task_id, "room_id": room_id}, {"$set": updates})
    doc = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return doc


@api.delete("/rooms/{room_id}/tasks/{task_id}")
async def delete_task(room_id: str, task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "room_id": room_id})
    return {"ok": True}


# ---------- Stats / Sessions ----------
@api.post("/sessions/log")
async def log_session(payload: SessionLog, user: dict = Depends(get_current_user)):
    today = now_utc().date().isoformat()
    minutes = max(0, int(payload.minutes))
    if minutes <= 0:
        return {"ok": True, "added": 0}

    await db.study_sessions.insert_one({
        "session_id": f"sess_{uuid.uuid4().hex[:10]}",
        "user_id": user["user_id"],
        "room_id": payload.room_id,
        "minutes": minutes,
        "date": today,
        "created_at": iso(now_utc()),
    })

    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    last_date = u.get("last_study_date")
    streak = u.get("streak_days", 0) or 0
    if last_date != today:
        yesterday = (now_utc().date() - timedelta(days=1)).isoformat()
        if last_date == yesterday:
            streak += 1
        else:
            streak = 1
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {"total_minutes": minutes},
            "$set": {"last_study_date": today, "streak_days": streak},
        },
    )
    return {"ok": True, "added": minutes, "streak": streak}


@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    total_minutes = u.get("total_minutes", 0) or 0
    streak = u.get("streak_days", 0) or 0

    today = now_utc().date().isoformat()
    week_ago = (now_utc().date() - timedelta(days=6)).isoformat()
    week_cur = db.study_sessions.find(
        {"user_id": user["user_id"], "date": {"$gte": week_ago}},
        {"_id": 0},
    )
    week_logs = await week_cur.to_list(1000)
    by_day: dict = {}
    for log in week_logs:
        by_day[log["date"]] = by_day.get(log["date"], 0) + log["minutes"]

    week_series = []
    for i in range(7):
        d = (now_utc().date() - timedelta(days=6 - i)).isoformat()
        week_series.append({"date": d, "minutes": by_day.get(d, 0)})

    today_minutes = by_day.get(today, 0)
    active_count = await db.rooms.count_documents({"participants.user_id": user["user_id"]})

    # My recent rooms
    my_rooms_cur = db.rooms.find(
        {"$or": [{"host_id": user["user_id"]}, {"participants.user_id": user["user_id"]}]},
        {"_id": 0, "passcode": 0},
    ).sort("created_at", -1).limit(6)
    my_rooms = await my_rooms_cur.to_list(6)

    return {
        "total_minutes": total_minutes,
        "today_minutes": today_minutes,
        "streak_days": streak,
        "active_rooms": active_count,
        "week_series": week_series,
        "my_rooms": my_rooms,
    }


@api.get("/leaderboard")
async def leaderboard():
    week_ago = (now_utc().date() - timedelta(days=6)).isoformat()
    pipeline = [
        {"$match": {"date": {"$gte": week_ago}}},
        {"$group": {"_id": "$user_id", "minutes": {"$sum": "$minutes"}}},
        {"$sort": {"minutes": -1}},
        {"$limit": 20},
    ]
    rows = await db.study_sessions.aggregate(pipeline).to_list(20)
    user_ids = [r["_id"] for r in rows]
    users_cur = db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0})
    users_map = {u["user_id"]: u for u in await users_cur.to_list(100)}
    result = []
    for i, r in enumerate(rows):
        u = users_map.get(r["_id"])
        if not u:
            continue
        result.append({
            "rank": i + 1,
            "user_id": r["_id"],
            "name": u["name"],
            "picture": u.get("picture"),
            "minutes": r["minutes"],
            "streak_days": u.get("streak_days", 0),
        })
    return result


# ---------- AI Recommendations ----------
@api.post("/ai/recommend")
async def ai_recommend(payload: AIRecommendRequest, user: dict = Depends(get_current_user)):
    """Use Claude Sonnet 4.5 via Emergent LLM key to suggest rooms / study tips."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.error("emergentintegrations import failed: %s", e)
        raise HTTPException(500, "AI service unavailable")

    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    interests = payload.interests or user.get("interests", [])
    goal = payload.goal or "improve focus and consistency"

    # Pull a sample of open public rooms for context
    rooms_cur = db.rooms.find({"is_private": False}, {"_id": 0, "passcode": 0}).limit(30)
    rooms = await rooms_cur.to_list(30)
    rooms_brief = [
        {
            "room_id": r["room_id"],
            "name": r["name"],
            "subject": r["subject"],
            "tags": r.get("tags", []),
            "participants": len(r.get("participants", [])),
        }
        for r in rooms
    ]

    chat = LlmChat(
        api_key=key,
        session_id=f"reco-{user['user_id']}",
        system_message=(
            "You are a friendly AI study coach for the Lumen Study Rooms app. "
            "Given a learner's interests and goal plus a list of available public study rooms, "
            "you recommend 2-3 rooms that fit best and write a short motivating note. "
            "Respond ONLY with strict JSON of shape: "
            '{"recommendations":[{"room_id":"...","why":"..."}],"tip":"..."}. '
            "If no rooms match, return an empty recommendations array and still write a helpful tip."
        ),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    prompt = (
        f"Interests: {', '.join(interests) if interests else 'general study'}\n"
        f"Goal: {goal}\n"
        f"Available rooms (JSON): {rooms_brief}\n"
        "Recommend up to 3 rooms with reasons and one practical study tip."
    )

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error("LLM error: %s", e)
        raise HTTPException(502, "AI recommendation failed")

    import json
    import re
    text = raw if isinstance(raw, str) else str(raw)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    parsed = {"recommendations": [], "tip": text.strip()}
    if match:
        try:
            parsed = json.loads(match.group(0))
        except Exception:
            pass

    # Enrich with full room data
    rec_ids = [r.get("room_id") for r in parsed.get("recommendations", []) if r.get("room_id")]
    if rec_ids:
        full_cur = db.rooms.find({"room_id": {"$in": rec_ids}}, {"_id": 0, "passcode": 0})
        full_map = {x["room_id"]: x for x in await full_cur.to_list(10)}
        enriched = []
        for r in parsed.get("recommendations", []):
            base = full_map.get(r.get("room_id"))
            if base:
                enriched.append({**base, "why": r.get("why", "")})
        parsed["recommendations"] = enriched

    return parsed


# ---------- Health ----------
@api.get("/")
async def root():
    return {"app": "Virtual Study Rooms", "ok": True}


# Register router
app.include_router(api)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
