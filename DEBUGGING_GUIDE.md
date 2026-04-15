# CORS & Network Debugging Guide

## Error You Saw
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8080/auth/login. 
(Reason: CORS request did not succeed). Status code: (null).
```

---

## Why This Happens - Visual Explanation

### ❌ BEFORE FIX (What You Had)
```
┌─────────────────────────────────────────┐
│ Browser on localhost:8080               │
│                                         │
│  fetch('http://localhost:8080/auth/..') │
│         ↓                               │
│  ❌ CORS Error! Same origin but port   │
│     conflict - can't connect to server  │
└─────────────────────────────────────────┘
```

### ✅ AFTER FIX (What You Have Now)
```
┌──────────────────────────────────────────────────────┐
│ Browser on localhost:5173 (Frontend)                 │
│                                                      │
│  fetch('/api/auth/login')                           │
│         ↓                                           │
│  Same-origin request (localhost:5173 → localhost... │
│         ↓                                           │
│  Vite Dev Proxy intercepts                         │
│         ↓                                           │
│  Proxy forwards to: http://localhost:8080/auth/... │
│         ↓                                           │
│  ✅ Backend responds normally                      │
│  ✅ No CORS restrictions (server-to-server)        │
└──────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────┐
│ Spring Boot Backend on localhost:8080                │
└──────────────────────────────────────────────────────┘
```

---

## Debugging Steps

### Step 1: Verify Both Servers Are Running

#### Check Frontend (should be port 5173)
```bash
# Terminal 1 - Frontend
$ npm run dev

# You should see:
#   ➜  Local:   http://localhost:5173/
#   ➜  press h to show help
```

#### Check Backend (should be port 8080)
```bash
# Terminal 2 - Backend
$ mvn spring-boot:run

# You should see:
#   Started RideFlowApplication in 2.345 seconds
#   Tomcat started on port(s): 8080 (http)
```

### Step 2: Check Browser DevTools

Open `http://localhost:5173` and press **F12** to open DevTools.

#### Check Network Tab
1. Click **Network** tab
2. Try to login
3. Look for request to `/api/auth/login`
4. **Expected**:
   - Status: **200** (if login succeeds) or **401** (wrong password)
   - No CORS error
   - Response contains `{token, role}`

#### Check Console Tab
```javascript
// If you see this - CORS is NOT fixed
❌ Cross-Origin Request Blocked

// If you see this - CORS is fixed but login failed
✅ No CORS error, but 401 Unauthorized or 400 Bad Request
```

#### Check Application Tab (LocalStorage)
```javascript
// After successful login, you should see:
localStorage.getItem('token')   // → "eyJhbGc..."
localStorage.getItem('role')    // → "ROLE_CUSTOMER"
localStorage.getItem('email')   // → "user@example.com"
```

### Step 3: Test Direct Backend Connection

Test if backend is accessible:
```bash
# Terminal
$ curl http://localhost:8080/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Expected responses:
# ✅ Success (200): {"token":"eyJ...","role":"ROLE_CUSTOMER"}
# ✅ Wrong password (401): {"status":401,"message":"Invalid email or password"}
# ❌ Server not running: curl: (7) Failed to connect
```

### Step 4: Check Vite Proxy Configuration

In `vite.config.ts`, verify you have:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

Watch the terminal when you make requests - you should see:
```
[proxy] /api/auth/login -> http://localhost:8080/auth/login
```

---

## Common Issues & Solutions

### Issue 1: "Cannot connect to http://localhost:8080"
**Symptoms**: CORS error with `status code: (null)`

**Solutions**:
1. Check backend is running: `curl http://localhost:8080/auth/login`
2. Check firewall isn't blocking port 8080
3. Check no other app is using port 8080
4. Restart both servers

```bash
# Kill process on port 8080 (if using)
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Issue 2: Frontend running on 8080 (port conflict)

**Symptoms**: 
- DevTools shows requests to `http://localhost:8080` (not `/api`)
- Both frontend & backend trying to run on 8080

**Solution**:
Verify `vite.config.ts` has:
```typescript
port: 5173  // ← NOT 8080
```

Then restart frontend:
```bash
npm run dev  # Should start on 5173
```

### Issue 3: Vite Proxy Not Working

**Symptoms**:
- Requests to `/api` still fail with CORS
- Network tab shows requests are NOT being proxied

**Solution**:
1. Verify proxy config in `vite.config.ts` (see above)
2. Make sure you're using `/api` in your fetch calls
3. Restart Vite (`Ctrl+C` then `npm run dev`)

### Issue 4: Token Not Saved (Login appears to work but fails on next action)

**Symptoms**:
- Login succeeds, redirected to dashboard
- But then get 401 error on API calls
- localStorage shows empty token

**Debug**:
```javascript
// In browser console:
localStorage.getItem('token')  // Should NOT be null/empty

// In src/services/api.ts getAuthHeaders():
console.log('Auth headers:', getAuthHeaders());
// Should show: {Authorization: "Bearer eyJ...", ...}
```

**Solution**:
Check `src/contexts/AuthContext.tsx` - the `persistAuth` function should save to localStorage:
```typescript
const persistAuth = (email: string, token: string, role: UserRole) => {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('email', email);
  // ...
};
```

### Issue 5: Requests Going to Wrong URL

**Symptoms**:
- DevTools Network tab shows requests to `http://localhost:8080/api/auth/login`
- Instead of proxied request to `/api/auth/login`

**Solution**:
Check `src/services/api.ts`:
```typescript
// ✅ CORRECT (uses proxy)
const BASE_URL = '/api';

// ❌ WRONG (causes CORS)
const BASE_URL = 'http://localhost:8080';
```

---

## Network Tab Troubleshooting

### What to Look for in DevTools Network Tab

#### ✅ CORRECT Request (After Fix)
```
Request URL: http://localhost:5173/api/auth/login
Request Method: POST
Status: 200 OK (or 401 if wrong password)
Remote Address: 127.0.0.1:5173
Headers:
  Content-Type: application/json
Response:
  {
    "token": "eyJhbGc...",
    "role": "ROLE_CUSTOMER"
  }
```

#### ❌ INCORRECT Request (CORS Error)
```
Request URL: http://localhost:8080/auth/login
Status: (canceled) or (blocked)
Error in Console: 
  Cross-Origin Request Blocked
  The Same Origin Policy disallows reading the remote resource...
```

---

## Testing Endpoints Manually

### Test 1: Login
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'

# Expected response:
# {"token":"eyJ...","role":"ROLE_ADMIN"}
```

### Test 2: Get Rides (with Auth)
```bash
# First get token from above
TOKEN="eyJ..."

curl -X GET http://localhost:8080/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# [{id:1, pickupLocation:"...", ...}, ...]
```

### Test 3: Create Ride
```bash
TOKEN="eyJ..."

curl -X POST http://localhost:8080/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Times Square",
    "dropLocation": "JFK Airport",
    "scheduledTime": "2026-04-15T10:30:00"
  }'

# Expected response:
# {id:1, pickupLocation:"...", status:"PENDING", driverId:null}
```

---

## Quick Checklist - What Should Be Working

After applying the fix, verify:

- [ ] Frontend starts on `http://localhost:5173` (not 8080)
- [ ] Backend starts on `http://localhost:8080`
- [ ] Vite proxy shows requests: `[proxy] /api/... -> http://localhost:8080/...`
- [ ] No CORS errors in browser console
- [ ] Login form submits without error
- [ ] Token appears in localStorage after login
- [ ] Redirected to role-based dashboard
- [ ] Subsequent API calls don't show 401 errors

---

## If You Still Have Issues

1. **Restart both servers completely** - close terminals and start fresh
2. **Clear browser cache** - Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
3. **Clear localStorage** - `localStorage.clear()` in DevTools console
4. **Check Node & Java versions**:
   ```bash
   node --version    # Should be 16+
   java -version     # Should be 21
   ```
5. **Check ports are actually free**:
   ```bash
   lsof -i :5173   # Should show nothing or just vite
   lsof -i :8080   # Should show java process
   ```

---

## Production Deployment Notes

When you deploy:

1. **Remove Vite proxy** - it only works in dev
2. **Update BASE_URL** in `src/services/api.ts`:
   ```typescript
   const BASE_URL = 'https://api.yourdomain.com';
   ```
3. **Add CORS headers to Spring Boot** (optional but recommended):
   ```java
   @Configuration
   public class CorsConfig implements WebMvcConfigurer {
       @Override
       public void addCorsMappings(CorsRegistry registry) {
           registry.addMapping("/**")
               .allowedOrigins("https://yourdomain.com")
               .allowedMethods("*")
               .allowedHeaders("*");
       }
   }
   ```

---

## Questions?

Check:
1. **Can I access http://localhost:8080/auth/login from curl?** → Backend works
2. **Can I see requests in Network tab to `/api/auth/login`?** → Frontend works
3. **Can I see token in localStorage after login?** → Auth works

If all 3 are yes → Everything is working! 🎉
