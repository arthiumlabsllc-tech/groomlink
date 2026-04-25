#!/usr/bin/env python3
"""Deploy booking services fix - normalize service->services array"""
import paramiko, time, os

BASE = os.path.dirname(__file__)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting...")
ssh.connect("187.124.210.205", username="root", password="TwentyOranges#2512")
sftp = ssh.open_sftp()

# Upload booking.service.js
local = os.path.join(BASE, "services", "api", "dist", "services", "booking.service.js")
sftp.put(local, "/tmp/booking.service.js")
print("Uploaded booking.service.js")

# Copy to container
stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/booking.service.js groomlink-api:/app/dist/services/booking.service.js")
stdout.read()
print("Copied to container")

# Restart API
stdin, stdout, stderr = ssh.exec_command("docker restart groomlink-api")
stdout.read()
print("Restarted API, waiting 15s...")
time.sleep(15)

# Check health
stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=groomlink-api --format '{{.Names}}: {{.Status}}'")
status = stdout.read().decode().strip()
print(f"Status: {status}")

sftp.close()
ssh.close()
print("Done!")
