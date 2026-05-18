"""
Backend API regression tests for Lumen.Study (Virtual Study Rooms).
Covers: health, auth, profile, rooms CRUD, pomodoro, chat, tasks,
sessions/log, dashboard, leaderboard, and AI recommendations.

Uses synthetic users + sessions seeded in MongoDB before tests run.
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://focus-rooms-12.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ------------- Fixtures -------------
@pytest.fixture(scope="session")
def mongo_db():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


def _seed_user(db, suffix):
    uid = f"TEST_user_{suffix}_{uuid.uuid4().hex[:6]}"
    token = f"TEST_session_{suffix}_{uuid.uuid4().hex[:10]}"
    db.users.insert_one({
        "user_id": uid,
        "email": f"TEST_{suffix}_{uuid.uuid4().hex[:6]}@example.com",
        "name": f"Tester {suffix}",
        "picture": None,
        "bio": "",
        "interests": ["Math"],
        "total_minutes": 0,
        "streak_days": 0,
        "last_study_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return uid, token


@pytest.fixture(scope="session")
def host_user(mongo_db):
    uid, token = _seed_user(mongo_db, "host")
    yield {"user_id": uid, "token": token}
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def other_user(mongo_db):
    uid, token = _seed_user(mongo_db, "other")
    yield {"user_id": uid, "token": token}
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_many({"user_id": uid})


@pytest.fixture(scope="session")
def host_client(host_user):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {host_user['token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def other_client(other_user):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {other_user['token']}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Cleanup TEST rooms/messages/tasks after session
@pytest.fixture(scope="session", autouse=True)
def cleanup(mongo_db):
    yield
    mongo_db.rooms.delete_many({"name": {"$regex": "^TEST_"}})
    mongo_db.messages.delete_many({"text": {"$regex": "^TEST_"}})
    mongo_db.tasks.delete_many({"title": {"$regex": "^TEST_"}})
    mongo_db.study_sessions.delete_many({"user_id": {"$regex": "^TEST_user"}})


# Shared room ids used across tests
@pytest.fixture(scope="session")
def shared(host_client):
    # public room
    r = host_client.post(f"{API}/rooms", json={
        "name": "TEST_Public_Room",
        "description": "public test",
        "subject": "Math",
        "category": "subject",
        "tags": ["calculus", "limits"],
        "is_private": False,
    })
    assert r.status_code == 200, r.text
    public_id = r.json()["room_id"]

    # private room
    r = host_client.post(f"{API}/rooms", json={
        "name": "TEST_Private_Room",
        "description": "private test",
        "subject": "Physics",
        "category": "subject",
        "tags": ["mechanics"],
        "is_private": True,
        "passcode": "secret123",
    })
    assert r.status_code == 200, r.text
    private_id = r.json()["room_id"]
    return {"public": public_id, "private": private_id}


# ------------- Health -------------
def test_health(anon_client):
    r = anon_client.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ------------- Auth -------------
def test_auth_me_unauthenticated(anon_client):
    r = anon_client.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_me_with_token(host_client, host_user):
    r = host_client.get(f"{API}/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == host_user["user_id"]
    assert "_id" not in body


def test_auth_logout_then_invalid(mongo_db):
    uid, token = _seed_user(mongo_db, "logout")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    r = s.post(f"{API}/auth/logout")
    assert r.status_code == 200
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 401
    mongo_db.users.delete_many({"user_id": uid})


# ------------- Profile -------------
def test_profile_update(host_client, host_user):
    payload = {"name": "Renamed Tester", "bio": "loves studying", "interests": ["Math", "CS"]}
    r = host_client.put(f"{API}/users/me", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Renamed Tester"
    assert body["bio"] == "loves studying"
    assert "CS" in body["interests"]
    assert "_id" not in body
    # GET verify
    g = host_client.get(f"{API}/auth/me")
    assert g.json()["bio"] == "loves studying"


# ------------- Rooms -------------
def test_public_room_no_passcode_leak(shared, host_client):
    r = host_client.get(f"{API}/rooms/{shared['public']}")
    assert r.status_code == 200
    body = r.json()
    assert "passcode" not in body
    assert "_id" not in body


def test_list_rooms_filters_public(host_client, shared):
    r = host_client.get(f"{API}/rooms")
    assert r.status_code == 200
    rooms = r.json()
    ids = [x["room_id"] for x in rooms]
    assert shared["public"] in ids
    # default should NOT include private
    assert shared["private"] not in ids
    for rm in rooms:
        assert "passcode" not in rm
        assert "_id" not in rm


def test_list_rooms_filter_q_and_category(host_client):
    r = host_client.get(f"{API}/rooms", params={"q": "calculus"})
    assert r.status_code == 200
    names = [x["name"] for x in r.json()]
    assert any("Public_Room" in n for n in names)

    r = host_client.get(f"{API}/rooms", params={"category": "subject"})
    assert r.status_code == 200


def test_private_room_other_user_requires_passcode(shared, other_client):
    r = other_client.get(f"{API}/rooms/{shared['private']}")
    assert r.status_code == 200
    body = r.json()
    assert body.get("requires_passcode") is True
    assert "passcode" not in body


def test_join_private_wrong_passcode(shared, other_client):
    r = other_client.post(f"{API}/rooms/{shared['private']}/join", json={"passcode": "wrong"})
    assert r.status_code == 403


def test_join_private_correct_passcode(shared, other_client, other_user):
    r = other_client.post(f"{API}/rooms/{shared['private']}/join", json={"passcode": "secret123"})
    assert r.status_code == 200
    body = r.json()
    assert "passcode" not in body
    assert any(p["user_id"] == other_user["user_id"] for p in body["participants"])


def test_join_public_idempotent(shared, other_client, other_user):
    r1 = other_client.post(f"{API}/rooms/{shared['public']}/join", json={})
    r2 = other_client.post(f"{API}/rooms/{shared['public']}/join", json={})
    assert r1.status_code == 200 and r2.status_code == 200
    parts = r2.json()["participants"]
    count = sum(1 for p in parts if p["user_id"] == other_user["user_id"])
    assert count == 1


def test_set_status(shared, other_client):
    r = other_client.put(f"{API}/rooms/{shared['public']}/status", json={"status": "doubt"})
    assert r.status_code == 200
    assert r.json()["status"] == "doubt"


def test_leave_room(shared, other_client, other_user):
    # join then leave on private
    other_client.post(f"{API}/rooms/{shared['private']}/join", json={"passcode": "secret123"})
    r = other_client.post(f"{API}/rooms/{shared['private']}/leave")
    assert r.status_code == 200
    # verify removed by host
    # host_client fixture not here; use direct mongo via separate call
    # Instead re-join check via other_user perspective: should now requires_passcode
    g = other_client.get(f"{API}/rooms/{shared['private']}")
    assert g.json().get("requires_passcode") is True


# ------------- Pomodoro -------------
def test_pomodoro_non_host_forbidden(shared, other_client):
    r = other_client.post(f"{API}/rooms/{shared['public']}/pomodoro", json={"action": "start"})
    assert r.status_code == 403


def test_pomodoro_lifecycle(shared, host_client):
    r = host_client.post(f"{API}/rooms/{shared['public']}/pomodoro", json={"action": "start"})
    assert r.status_code == 200
    body = r.json()
    assert body["is_running"] is True
    assert body["started_at"] is not None

    time.sleep(1)
    r = host_client.post(f"{API}/rooms/{shared['public']}/pomodoro", json={"action": "pause"})
    assert r.status_code == 200
    body = r.json()
    assert body["is_running"] is False
    assert body["paused_remaining"] <= 25 * 60

    r = host_client.post(f"{API}/rooms/{shared['public']}/pomodoro", json={"action": "reset"})
    assert r.status_code == 200
    assert r.json()["paused_remaining"] == r.json()["duration_seconds"]

    r = host_client.post(f"{API}/rooms/{shared['public']}/pomodoro", json={"action": "skip"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] in ("short_break", "long_break", "focus")
    assert body["rounds_completed"] >= 1


# ------------- Chat -------------
def test_chat_post_and_list(shared, host_client):
    r = host_client.post(f"{API}/rooms/{shared['public']}/messages", json={"text": "TEST_hello"})
    assert r.status_code == 200
    msg = r.json()
    assert msg["text"] == "TEST_hello"
    assert "_id" not in msg
    created_at = msg["created_at"]

    # list
    g = host_client.get(f"{API}/rooms/{shared['public']}/messages")
    assert g.status_code == 200
    texts = [m["text"] for m in g.json()]
    assert "TEST_hello" in texts

    # post another, filter after
    time.sleep(0.05)
    r2 = host_client.post(f"{API}/rooms/{shared['public']}/messages", json={"text": "TEST_after"})
    assert r2.status_code == 200
    g2 = host_client.get(f"{API}/rooms/{shared['public']}/messages", params={"after": created_at})
    texts2 = [m["text"] for m in g2.json()]
    assert "TEST_after" in texts2
    assert "TEST_hello" not in texts2


# ------------- Tasks -------------
def test_tasks_crud(shared, host_client):
    c = host_client.post(f"{API}/rooms/{shared['public']}/tasks", json={"title": "TEST_task1"})
    assert c.status_code == 200
    task_id = c.json()["task_id"]
    assert "_id" not in c.json()

    l = host_client.get(f"{API}/rooms/{shared['public']}/tasks")
    assert l.status_code == 200
    assert any(t["task_id"] == task_id for t in l.json())

    u = host_client.patch(f"{API}/rooms/{shared['public']}/tasks/{task_id}", json={"completed": True})
    assert u.status_code == 200
    assert u.json()["completed"] is True

    d = host_client.delete(f"{API}/rooms/{shared['public']}/tasks/{task_id}")
    assert d.status_code == 200
    after = host_client.get(f"{API}/rooms/{shared['public']}/tasks").json()
    assert not any(t["task_id"] == task_id for t in after)


# ------------- Sessions / Dashboard / Leaderboard -------------
def test_session_log_and_dashboard(shared, host_client, host_user):
    r = host_client.post(f"{API}/sessions/log", json={"minutes": 30, "room_id": shared["public"]})
    assert r.status_code == 200
    body = r.json()
    assert body["added"] == 30
    assert body["streak"] >= 1

    d = host_client.get(f"{API}/dashboard")
    assert d.status_code == 200
    dash = d.json()
    assert dash["total_minutes"] >= 30
    assert dash["today_minutes"] >= 30
    assert dash["streak_days"] >= 1
    assert len(dash["week_series"]) == 7
    assert "my_rooms" in dash
    for room in dash["my_rooms"]:
        assert "passcode" not in room
        assert "_id" not in room


def test_leaderboard(anon_client, host_user):
    r = anon_client.get(f"{API}/leaderboard")
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    # our host_user should appear after logging session
    user_ids = [x["user_id"] for x in rows]
    assert host_user["user_id"] in user_ids


# ------------- AI recommend -------------
def test_ai_recommend(host_client):
    r = host_client.post(f"{API}/ai/recommend", json={"interests": ["Math"], "goal": "improve focus"}, timeout=90)
    if r.status_code in (502, 503):
        pytest.skip(f"LLM soft failure: {r.status_code} {r.text[:200]}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "recommendations" in body
    assert "tip" in body
    assert isinstance(body["recommendations"], list)
