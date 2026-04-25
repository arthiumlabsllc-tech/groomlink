#!/usr/bin/env python3
"""Deploy just the booking.service.js fix to VPS"""
import paramiko
import os
import time

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASS = "TwentyOranges#2512"
LOCAL_FILE = r"c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\services\api\dist\services\booking.service.js"
REMOTE_TMP = "/tmp/booking.service.js"
CONTAINER = "groomlink-api"
CONTAINER_PATH = "/app/dist/services/booking.service.js"

print("=" * 60)
print("  Deploying booking.service.js fix to VPS")
print("=" * 60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)

# Step 1: Upload the single file
print("\n1. Uploading booking.service.js...")
sftp = ssh.open_sftp()
sftp.put(LOCAL_FILE, REMOTE_TMP)
sftp.close()
print("   Done")

# Step 2: Copy into container
print("\n2. Copying into API container...")
stdin, stdout, stderr = ssh.exec_command(f"docker cp {REMOTE_TMP} {CONTAINER}:{CONTAINER_PATH}")
stdout.read()
print("   Done")

# Step 3: Restart
print("\n3. Restarting API container...")
stdin, stdout, stderr = ssh.exec_command(f"docker restart {CONTAINER}")
print(f"   {stdout.read().decode().strip()}")

# Step 4: Wait and check health
print("\n4. Waiting for API to start...")
time.sleep(12)
print("\n5. Checking API health...")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost/api/health")
health = stdout.read().decode().strip()
print(f"   {health[:200]}")

ssh.close()
print("\n" + "=" * 60)
print("  Deployment Complete!")
print("=" * 60)
