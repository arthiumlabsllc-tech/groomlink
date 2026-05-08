#!/usr/bin/env python3
"""Copy changed payment source files to VPS and rebuild"""
import paramiko
import os

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"
CONTAINER = "groomlink-api"
PROJECT_DIR = "/opt/groomlink"

API_FILES = [
    ("services/api/src/services/payment-provider.interface.ts", "services/api/src/services/payment-provider.interface.ts"),
    ("services/api/src/services/hubtel.provider.ts", "services/api/src/services/hubtel.provider.ts"),
    ("services/api/src/services/payment.service.ts", "services/api/src/services/payment.service.ts"),
    ("services/api/src/controllers/admin.controller.ts", "services/api/src/controllers/admin.controller.ts"),
    ("services/api/src/routes/admin.routes.ts", "services/api/src/routes/admin.routes.ts"),
]

ADMIN_FILES = [
    ("apps/admin/src/api/settings.ts", "apps/admin/src/api/settings.ts"),
    ("apps/admin/src/hooks/useSettings.ts", "apps/admin/src/hooks/useSettings.ts"),
    ("apps/admin/src/pages/Settings.tsx", "apps/admin/src/pages/Settings.tsx"),
]

def main():
    print("=" * 60)
    print("  Copying Payment Fix Files to VPS")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("\nConnecting to VPS...")
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD)
    print("Connected!")

    sftp = ssh.open_sftp()

    local_base = os.path.dirname(os.path.abspath(__file__))

    for local_rel, remote_rel in API_FILES + ADMIN_FILES:
        local_path = os.path.join(local_base, local_rel)
        remote_path = f"{PROJECT_DIR}/{remote_rel}".replace('\\', '/')
        print(f"\n  Copying: {local_rel}")
        print(f"    -> {remote_path}")
        sftp.put(local_path, remote_path)

    sftp.close()
    print("\n  All files copied!")

    def run(cmd, timeout=120):
        print(f"\n  > {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(f"    {out[:500]}")
        if err and err != out:
            print(f"    STDERR: {err[:500]}")
        return out, err

    # Rebuild and restart API
    print("\n2. Rebuilding API container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml build api", timeout=180)

    print("\n3. Restarting API container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml up -d api", timeout=60)

    # Rebuild and restart Admin
    print("\n4. Rebuilding Admin container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml build admin", timeout=180)

    print("\n5. Restarting Admin container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml up -d admin", timeout=60)

    print("\n6. Waiting 10s for services to start...")
    import time
    time.sleep(10)

    print("\n7. Checking container status...")
    run("docker ps --filter name=groomlink --format '{{.Names}}: {{.Status}}'")

    ssh.close()
    print("\n" + "=" * 60)
    print("  Deployment Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
