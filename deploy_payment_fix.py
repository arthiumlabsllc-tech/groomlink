#!/usr/bin/env python3
"""Deploy admin dashboard + API payment fix to VPS"""
import paramiko
import os
import time

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"

BASE = os.path.dirname(__file__)
ADMIN_DIST = os.path.join(BASE, "apps", "admin", "dist")
API_DIST = os.path.join(BASE, "services", "api", "dist")

def main():
    print("=" * 60)
    print("  Deploying Admin + API payment gateway fixes to VPS")
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
        if err and 'WARNING' not in err:
            print(f"    STDERR: {err[:300]}")
        return out, err

    def upload_dir(local_dir, remote_dir):
        """Recursively upload a directory"""
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            sftp.mkdir(remote_dir)
        for item in os.listdir(local_dir):
            local_path = os.path.join(local_dir, item)
            remote_path = f"{remote_dir}/{item}"
            if os.path.isdir(local_path):
                upload_dir(local_path, remote_path)
            else:
                sftp.put(local_path, remote_path)

    # --- Deploy Admin Dashboard ---
    print("\n--- ADMIN DASHBOARD ---")
    print("1. Uploading admin dist to VPS...")
    run("rm -rf /tmp/admin-dist")
    upload_dir(ADMIN_DIST, "/tmp/admin-dist")
    print("   Uploaded!")

    print("2. Copying into admin container...")
    run("docker cp /tmp/admin-dist/. groomlink-admin:/usr/share/nginx/html/")

    print("3. Reloading nginx in admin container...")
    run("docker exec groomlink-admin nginx -s reload")

    # --- Deploy API (changed files) ---
    print("\n--- API BACKEND ---")
    
    # Upload the two changed compiled files
    print("4. Uploading changed API files...")
    
    # admin.controller.js
    local_admin_ctrl = os.path.join(API_DIST, "controllers", "admin.controller.js")
    sftp.put(local_admin_ctrl, "/tmp/admin.controller.js")
    run("docker cp /tmp/admin.controller.js groomlink-api:/app/dist/controllers/admin.controller.js")
    
    # payment-provider.registry.js
    local_registry = os.path.join(API_DIST, "services", "payment-provider.registry.js")
    sftp.put(local_registry, "/tmp/payment-provider.registry.js")
    run("docker cp /tmp/payment-provider.registry.js groomlink-api:/app/dist/services/payment-provider.registry.js")
    print("   Uploaded!")

    print("5. Restarting API container...")
    run("docker restart groomlink-api", timeout=30)

    print("\n6. Waiting 15s for API to start...")
    time.sleep(15)

    print("7. Checking container status...")
    run("docker ps --filter name=groomlink-admin --format '{{.Status}}'")
    run("docker ps --filter name=groomlink-api --format '{{.Status}}'")

    sftp.close()
    ssh.close()

    print("\n" + "=" * 60)
    print("  Deployment Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
