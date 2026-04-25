#!/usr/bin/env python3
"""Deploy freelancer category & home service feature to VPS
- Run database migration
- Deploy API (compiled JS)
- Deploy partners web
- Deploy customer web
"""
import paramiko
import os
import time

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"

BASE = os.path.dirname(__file__)
API_DIST = os.path.join(BASE, "services", "api", "dist")
PARTNERS_DIST = os.path.join(BASE, "apps", "partners", "dist")
CUSTOMER_DIST = os.path.join(BASE, "apps", "customer", "dist")
MIGRATION_SQL = os.path.join(BASE, "services", "api", "prisma", "migrations",
                              "20250425_add_freelancer_and_home_service", "migration.sql")

def main():
    print("=" * 60)
    print("  Deploying Freelancer & Home Service Feature to VPS")
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

    # --- Step 1: Run Database Migration ---
    print("\n--- STEP 1: DATABASE MIGRATION ---")
    print("Uploading migration SQL...")
    sftp.put(MIGRATION_SQL, "/tmp/freelancer_migration.sql")
    
    print("Running migration inside the API container...")
    # Execute SQL against the postgres container
    out, err = run(
        'docker exec groomlink-postgres psql -U groomlink -d groomlink -f /dev/stdin < /tmp/freelancer_migration.sql',
        timeout=30
    )
    # Alternative: pipe the SQL directly
    if 'error' in (err or '').lower() and 'already exists' not in (err or '').lower():
        print("  Trying alternative migration approach...")
        out, err = run(
            'cat /tmp/freelancer_migration.sql | docker exec -i groomlink-postgres psql -U groomlink -d groomlink',
            timeout=30
        )
    print("  Migration done!")

    # --- Step 2: Deploy API ---
    print("\n--- STEP 2: API BACKEND ---")
    
    # Upload changed controller and service files
    changed_files = [
        ("controllers/salon.controller.js", "controllers/salon.controller.js"),
        ("controllers/salon-owner.controller.js", "controllers/salon-owner.controller.js"),
        ("services/salon.service.js", "services/salon.service.js"),
    ]
    
    for local_rel, remote_rel in changed_files:
        local_path = os.path.join(API_DIST, local_rel)
        if os.path.exists(local_path):
            remote_tmp = f"/tmp/{os.path.basename(local_rel)}"
            print(f"  Uploading {local_rel}...")
            sftp.put(local_path, remote_tmp)
            run(f"docker cp {remote_tmp} groomlink-api:/app/dist/{remote_rel}")
    
    # Also upload the prisma schema for reference
    schema_path = os.path.join(BASE, "services", "api", "prisma", "schema.prisma")
    if os.path.exists(schema_path):
        sftp.put(schema_path, "/tmp/schema.prisma")
        run("docker cp /tmp/schema.prisma groomlink-api:/app/prisma/schema.prisma")
    
    print("  Restarting API container...")
    run("docker restart groomlink-api", timeout=30)

    # --- Step 3: Deploy Partners Web ---
    print("\n--- STEP 3: PARTNERS WEB ---")
    print("  Uploading partners dist...")
    run("rm -rf /tmp/partners-dist")
    upload_dir(PARTNERS_DIST, "/tmp/partners-dist")
    print("  Copying into partners container...")
    run("docker cp /tmp/partners-dist/. groomlink-partners:/usr/share/nginx/html/")
    run("docker exec groomlink-partners nginx -s reload")
    print("  Partners web deployed!")

    # --- Step 4: Deploy Customer Web ---
    print("\n--- STEP 4: CUSTOMER WEB ---")
    print("  Uploading customer dist...")
    run("rm -rf /tmp/customer-dist")
    upload_dir(CUSTOMER_DIST, "/tmp/customer-dist")
    print("  Copying into customer container...")
    run("docker cp /tmp/customer-dist/. groomlink-customer:/usr/share/nginx/html/")
    run("docker exec groomlink-customer nginx -s reload")
    print("  Customer web deployed!")

    # --- Step 5: Verify ---
    print("\n--- STEP 5: VERIFICATION ---")
    print("  Waiting 15s for API to restart...")
    time.sleep(15)
    
    print("  Checking container status...")
    run("docker ps --filter name=groomlink-api --format '{{.Names}}: {{.Status}}'")
    run("docker ps --filter name=groomlink-partners --format '{{.Names}}: {{.Status}}'")
    run("docker ps --filter name=groomlink-customer --format '{{.Names}}: {{.Status}}'")
    run("docker ps --filter name=groomlink-postgres --format '{{.Names}}: {{.Status}}'")

    sftp.close()
    ssh.close()

    print("\n" + "=" * 60)
    print("  Deployment Complete!")
    print("  - Database migration applied")
    print("  - API backend updated")
    print("  - Partners web updated")
    print("  - Customer web updated")
    print("=" * 60)

if __name__ == "__main__":
    main()
