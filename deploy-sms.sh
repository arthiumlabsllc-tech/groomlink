#!/bin/bash
# Deploy updated API files via SCP
SERVER="root@187.124.210.205"
REMOTE_DIR="/opt/groomlink"

echo "=== Uploading updated API files ==="

# Upload the SMS service with Africa's Talking integration
scp /home/ubuntu/Desktop/GroomLink/services/api/src/services/sms.service.ts $SERVER:$REMOTE_DIR/services/api/src/services/sms.service.ts

# Upload the auth service with sendOTPSMS wiring
scp /home/ubuntu/Desktop/GroomLink/services/api/src/services/auth.service.ts $SERVER:$REMOTE_DIR/services/api/src/services/auth.service.ts

# Upload the package.json with africastalking dependency
scp /home/ubuntu/Desktop/GroomLink/services/api/package.json $SERVER:$REMOTE_DIR/services/api/package.json

# Upload type declarations if they exist
scp /home/ubuntu/Desktop/GroomLink/services/api/src/types/africastalking.d.ts $SERVER:$REMOTE_DIR/services/api/src/types/africastalking.d.ts 2>/dev/null

echo "=== Files uploaded. Now rebuilding API container ==="

# Rebuild and restart on the server
ssh $SERVER "cd $REMOTE_DIR && docker-compose build api 2>&1 | tail -10 && docker-compose up -d api 2>&1 && sleep 12 && echo '=== API Status ===' && docker ps | grep api && echo '=== Testing OTP ===' && curl -s -X POST http://localhost:3000/api/auth/otp/request -H 'Content-Type: application/json' -d '{\"phoneNumber\": \"+233200000001\"}'"

echo ""
echo "=== Deploy Complete ==="
