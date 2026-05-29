# 🚀 Manual Deployment Instructions - Admin Permission System

## Prerequisites
- SSH access to VPS: `root@157.180.23.250`
- Code changes pushed to Git repository

## Quick Deploy Commands

### Option 1: SSH and Deploy (Recommended)

```bash
# SSH into VPS
ssh root@157.180.23.250

# Navigate to project directory
cd /root/groomlink

# Pull latest code (if using Git)
git pull

# Build API with permission middleware
docker build -t groomlink-api:latest -f services/api/Dockerfile .

# Restart API
docker-compose up -d api

# Wait for API to start
sleep 15

# Verify API is running
curl http://localhost:3001/health

# Build Admin Dashboard
docker build -t groomlink-admin:latest -f apps/admin/Dockerfile .

# Restart Admin
docker-compose up -d admin

# Wait for Admin to start
sleep 15

# Verify Admin is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002

# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|api|admin"
```

### Option 2: One-Liner (Copy & Paste)

```bash
ssh root@157.180.23.250 'cd /root/groomlink && git pull && docker build -t groomlink-api:latest -f services/api/Dockerfile . && docker-compose up -d api && sleep 15 && docker build -t groomlink-admin:latest -f apps/admin/Dockerfile . && docker-compose up -d admin && sleep 15 && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

## What Was Fixed Before Deployment

### ✅ Fixed TypeScript Errors

1. **UserRole.PARTNER → UserRole.SALON_OWNER**
   - File: `services/api/src/controllers/admin.controller.ts:1190`
   - Changed invalid `PARTNER` role to valid `SALON_OWNER`

2. **Prisma Client Regenerated**
   - Regenerated Prisma client to include `AuditLog` model
   - Command: `npx prisma generate`

### ✅ Build Status

- **Admin Dashboard:** ✅ Builds successfully
- **API:** ✅ Builds successfully (after fixes)

## Post-Deployment Testing

### Test 1: Verify Deployment

```bash
# Check API health
curl https://api.groomlinkgh.com/health

# Check Admin dashboard (should return HTML)
curl -I https://admin.groomlinkgh.com
```

### Test 2: SUPER_ADMIN Access

1. Login to https://admin.groomlinkgh.com as SUPER_ADMIN
2. Verify ALL pages visible in sidebar:
   - Dashboard, Salons, Users, Transactions, Promotions
   - Sponsored Salons, Subscriptions, Feedback
   - Support, Support Staff
   - Escrow, Cancellations, No-Shows
   - Security, Policies, Settings
   - **Admin Management** (only for SUPER_ADMIN)

### Test 3: Create Restricted Admin

1. Go to Admin Management page
2. Click "Create Admin"
3. Fill in details:
   - Email: test-admin@groomlinkgh.com
   - First Name: Test
   - Last Name: Admin
4. Click **"Support Staff"** preset
5. Verify only these pages are selected:
   - ✅ Dashboard
   - ✅ Support
   - ✅ Support Staff
   - ✅ Users
6. Click "Create Admin"

### Test 4: Test Restricted Access (Frontend)

1. Logout from SUPER_ADMIN
2. Login as the new restricted admin
3. Verify sidebar shows ONLY:
   - Dashboard
   - Support
   - Support Staff
   - Users
4. Try navigating to: `https://admin.groomlinkgh.com/salons`
5. Should redirect to: `https://admin.groomlinkgh.com/access-denied`
6. Verify "Access Denied" page displays correctly

### Test 5: Test Restricted Access (Backend)

1. As restricted admin, open browser DevTools (F12)
2. Go to Network tab
3. Try accessing restricted API:
   ```javascript
   fetch('https://api.groomlinkgh.com/admin/salons', {
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN_HERE'
     }
   })
   ```
4. Should receive **HTTP 403 Forbidden**
5. Try accessing permitted API:
   ```javascript
   fetch('https://api.groomlinkgh.com/admin/support/tickets', {
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN_HERE'
     }
   })
   ```
6. Should receive **HTTP 200** with data

## Troubleshooting

### Issue: Docker build fails

```bash
# Check Docker logs
docker logs groomlink-api --tail 50

# Rebuild without cache
docker build --no-cache -t groomlink-api:latest -f services/api/Dockerfile .
```

### Issue: Container won't start

```bash
# Check container logs
docker logs groomlink-api
docker logs groomlink-admin

# Check if ports are in use
netstat -tulpn | grep -E '3001|3002'

# Force restart
docker-compose down
docker-compose up -d api admin
```

### Issue: Permission system not working

```bash
# Check API logs for permission errors
docker logs groomlink-api 2>&1 | grep -i "permission\|forbidden\|403"

# Verify Prisma migration is applied
ssh root@157.180.23.250 'cd /root/groomlink/services/api && npx prisma migrate status'

# Check if AdminPermission table exists
ssh root@157.180.23.250 'cd /root/groomlink/services/api && npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM "AdminPermission";
EOF'
```

### Issue: Can't connect to VPS

```bash
# Test SSH connection
ssh -v root@157.180.23.250

# Check if VPS is reachable
ping 157.180.23.250

# Check firewall rules
# (Run on VPS)
iptables -L -n | grep 22
```

## Rollback Instructions (If Needed)

```bash
# SSH into VPS
ssh root@157.180.23.250
cd /root/groomlink

# Find previous image tags
docker images | grep groomlink

# Rollback API
docker-compose stop api
docker tag groomlink-api:previous groomlink-api:latest
docker-compose up -d api

# Rollback Admin
docker-compose stop admin
docker tag groomlink-admin:previous groomlink-admin:latest
docker-compose up -d admin
```

## Files Changed Summary

### Frontend (5 files)
1. `apps/admin/src/api/auth.ts` - Added permissions to user interface
2. `apps/admin/src/pages/AccessDenied.tsx` - NEW: Access denied page
3. `apps/admin/src/components/Layout.tsx` - Permission-aware navigation
4. `apps/admin/src/App.tsx` - Enhanced PermissionGuard
5. `apps/admin/src/pages/AdminManagement.tsx` - Presets + page registry

### Backend (4 files)
1. `services/api/src/middleware/permission.ts` - NEW: Permission middleware
2. `services/api/src/controllers/user.controller.ts` - Include permissions in profile
3. `services/api/src/routes/admin.routes.ts` - Added permission checks to routes
4. `services/api/src/routes/user.routes.ts` - Added permission checks

### Fixed (2 files)
1. `services/api/src/controllers/admin.controller.ts` - Fixed UserRole.PARTNER → SALON_OWNER
2. `services/api/prisma/` - Regenerated Prisma client

## Success Criteria

✅ API builds without errors
✅ Admin builds without errors
✅ SUPER_ADMIN can see all pages including Admin Management
✅ Restricted admin sees only permitted pages
✅ Restricted admin gets redirected to /access-denied for unauthorized pages
✅ API returns 403 for unauthorized endpoint access
✅ Permission presets work correctly in Admin Management UI

## Next Steps After Deployment

1. Create admin accounts for team members with appropriate presets
2. Monitor access denied logs for any legitimate access issues
3. Consider adding audit logging for permission changes
4. Document permission requirements for each team role
5. Train admins on the new permission system

---

**Deployed:** $(date)
**Version:** Permission System v1.0
**Status:** Ready for production deployment
