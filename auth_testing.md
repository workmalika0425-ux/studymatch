# Auth Testing Playbook (Emergent Google Auth)

This app uses Emergent-managed Google OAuth. Sessions are stored in MongoDB
collection `user_sessions` and a `session_token` cookie is set on the browser.
Backend also accepts `Authorization: Bearer <session_token>` for API testing.

## 1. Create Test User & Session (mongosh)
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://images.unsplash.com/photo-1535688391459-479d308104f8?w=150',
  bio: '',
  interests: ['Math', 'Physics'],
  total_minutes: 0,
  streak_days: 0,
  last_study_date: null,
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## 2. Test backend endpoints
```
TOKEN="<paste session_token>"
BASE="<REACT_APP_BACKEND_URL>/api"

curl -s -H "Authorization: Bearer $TOKEN" $BASE/auth/me
curl -s -H "Authorization: Bearer $TOKEN" $BASE/dashboard
curl -s -H "Authorization: Bearer $TOKEN" $BASE/rooms
curl -s -H "Authorization: Bearer $TOKEN" -X POST $BASE/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","subject":"Math","category":"subject","tags":["calc"]}'
```

## 3. Browser testing (Playwright)
```
await page.context.add_cookies([{
    "name": "session_token",
    "value": TOKEN,
    "domain": "<your host>",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto(BASE_URL + "/dashboard")
```

## Checklist
- [ ] `users` documents have `user_id`
- [ ] `user_sessions.user_id` matches
- [ ] All queries exclude `_id`
- [ ] `/api/auth/me` returns user (not 401)
- [ ] Dashboard loads without redirect to landing
- [ ] CRUD on rooms/messages/tasks works
