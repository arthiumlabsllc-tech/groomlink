#!/usr/bin/env python3
"""Deploy site logo upload feature: migration + API + admin"""
import paramiko, time, os

BASE = os.path.dirname(__file__)
VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print("Connecting to VPS...")
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD)
sftp = ssh.open_sftp()

def run(cmd, timeout=60):
    print(f"  > {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f"    {out[:500]}")
    if err and 'WARNING' not in err and 'notice' not in err.lower():
        print(f"    STDERR: {err[:300]}")
    return out, err

def upload_dir(local_dir, remote_dir):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    for item in os.listdir(local_dir):
        lp = os.path.join(local_dir, item)
        rp = f"{remote_dir}/{item}"
        if os.path.isdir(lp):
            upload_dir(lp, rp)
        else:
            sftp.put(lp, rp)

# 1. Run migration
print("\n--- MIGRATION ---")
migration_sql = os.path.join(BASE, "services", "api", "prisma", "migrations", "20250425_add_footer_logo", "migration.sql")
sftp.put(migration_sql, "/tmp/footer_logo_migration.sql")
run('cat /tmp/footer_logo_migration.sql | docker exec -i groomlink-postgres psql -U groomlink -d groomlink')

# 2. Deploy API files
print("\n--- API ---")
api_dist = os.path.join(BASE, "services", "api", "dist")
files_to_deploy = [
    "controllers/admin.controller.js",
    "routes/admin.routes.js",
]
for rel in files_to_deploy:
    local = os.path.join(api_dist, rel)
    if os.path.exists(local):
        tmp = f"/tmp/{os.path.basename(rel)}"
        sftp.put(local, tmp)
        run(f"docker cp {tmp} groomlink-api:/app/dist/{rel}")
        print(f"  Deployed {rel}")

# Also update prisma schema
schema = os.path.join(BASE, "services", "api", "prisma", "schema.prisma")
sftp.put(schema, "/tmp/schema.prisma")
run("docker cp /tmp/schema.prisma groomlink-api:/app/prisma/schema.prisma")

run("docker restart groomlink-api", timeout=30)

# 3. Deploy admin
print("\n--- ADMIN ---")
admin_dist = os.path.join(BASE, "apps", "admin", "dist")
run("rm -rf /tmp/admin-dist")
upload_dir(admin_dist, "/tmp/admin-dist")
run("docker cp /tmp/admin-dist/. groomlink-admin:/usr/share/nginx/html/")
run("docker exec groomlink-admin nginx -s reload")

# 4. Verify
print("\n--- VERIFY ---")
print("Waiting 15s...")
time.sleep(15)
run("docker ps --filter name=groomlink-api --format '{{.Names}}: {{.Status}}'")
run("docker ps --filter name=groomlink-admin --format '{{.Names}}: {{.Status}}'")

sftp.close()
ssh.close()
print("\nDone! Logo upload feature deployed.")
