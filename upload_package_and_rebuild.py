#!/usr/bin/env python3
"""Upload package.json and rebuild support dashboard."""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.124.210.205', username='root', password='KilltheOranges#2512', timeout=15)
sftp = ssh.open_sftp()

try:
    print("Uploading package.json with socket.io-client...")
    sftp.put(
        'apps/support/package.json',
        '/opt/groomlink/apps/support/package.json'
    )
    print("✅ package.json uploaded\n")
    
    print("Rebuilding support dashboard (npm install will run)...")
    _, out, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build --no-cache support 2>&1 | grep -A 5 -B 5 "socket.io-client\\|error\\|SUCCESS\\|DONE" | tail -50',
        timeout=900
    )
    build_output = out.read().decode()
    print(build_output)
    
    print("\nFull build output (last 100 lines):")
    _, out2, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build --no-cache support 2>&1 | tail -100',
        timeout=900
    )
    print(out2.read().decode())
    
finally:
    sftp.close()
    ssh.close()
