#!/usr/bin/env python3
"""Deploy admin controller fix to VPS"""
import paramiko, time, os

BASE = os.path.dirname(__file__)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting...")
ssh.connect("187.124.210.205", username="root", password="TwentyOranges#2512")
sftp = ssh.open_sftp()

local = os.path.join(BASE, "services", "api", "dist", "controllers", "admin.controller.js")
sftp.put(local, "/tmp/admin.controller.js")
print("Uploaded admin.controller.js")

stdin, stdout, stderr = ssh.exec_command("docker cp /tmp/admin.controller.js groomlink-api:/app/dist/controllers/admin.controller.js")
stdout.read()
print("Copied to container")

stdin, stdout, stderr = ssh.exec_command("docker restart groomlink-api")
stdout.read()
print("Restarted API, waiting 15s...")
time.sleep(15)

stdin, stdout, stderr = ssh.exec_command("docker ps --filter name=groomlink-api --format '{{.Names}}: {{.Status}}'")
print(stdout.read().decode())

sftp.close()
ssh.close()
print("Done!")
