#!/usr/bin/env python3
"""Deploy only the booking controller fix to VPS"""
import paramiko
import os
import time

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"
CONTAINER = "groomlink-api"

BASE = os.path.dirname(__file__)
CONTROLLER_FILE = os.path.join(BASE, "services", "api", "dist", "controllers", "booking.controller.js")

def main():
    print("=" * 60)
    print("  Deploying booking controller fix to VPS")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("\nConnecting to VPS...")
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD)
    sftp = ssh.open_sftp()
    print("Connected!")

    def run(cmd, timeout=60):
        print(f"  > {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(f"    {out[:500]}")
        if err:
            print(f"    STDERR: {err[:500]}")
        return out, err

    # Step 1: Upload the single compiled controller file
    print("\n1. Uploading booking.controller.js to /tmp/...")
    sftp.put(CONTROLLER_FILE, "/tmp/booking.controller.js")
    print("   Uploaded!")

    # Step 2: Copy into the running container
    print("\n2. Copying into API container...")
    run(f"docker cp /tmp/booking.controller.js {CONTAINER}:/app/dist/controllers/booking.controller.js")

    # Step 3: Restart the container
    print("\n3. Restarting API container...")
    run(f"docker restart {CONTAINER}", timeout=30)

    # Step 4: Wait and check
    print("\n4. Waiting 15s for API to start...")
    time.sleep(15)

    print("\n5. Checking API health...")
    run("curl -s http://localhost/api/health")

    print("\n6. Checking container status...")
    run(f"docker ps --filter name={CONTAINER} --format '{{{{.Status}}}}'")

    sftp.close()
    ssh.close()

    print("\n" + "=" * 60)
    print("  Booking fix deployed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
