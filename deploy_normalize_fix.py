#!/usr/bin/env python3
"""Deploy booking normalizeBookingResponse fix to VPS"""
import paramiko
import os
import time

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASS = "TwentyOranges#2512"
LOCAL_DIST = r"c:\Users\Robin\Desktop\Arthium Labs LLC\GroomLink Ghana\services\api\dist"
REMOTE_TMP = "/tmp/api-dist"
CONTAINER = "groomlink-api"

def run_cmd(ssh, cmd, timeout=60):
    print(f"  > {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(f"    {out[:300]}")
    if err and 'warning' not in err.lower(): print(f"    ERR: {err[:300]}")
    return out

def upload_dir(sftp, local, remote):
    """Upload directory recursively"""
    for item in os.listdir(local):
        local_path = os.path.join(local, item)
        remote_path = f"{remote}/{item}"
        if os.path.isdir(local_path):
            try: sftp.mkdir(remote_path)
            except: pass
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

print("=" * 60)
print("  Deploying normalizeBookingResponse fix to VPS")
print("=" * 60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)

# Step 1: Upload dist
print("\n1. Uploading compiled API dist...")
sftp = ssh.open_sftp()
run_cmd(ssh, f"rm -rf {REMOTE_TMP} && mkdir -p {REMOTE_TMP}")
upload_dir(sftp, LOCAL_DIST, REMOTE_TMP)
sftp.close()
print("   Done uploading dist files")

# Step 2: Copy into container
print("\n2. Copying dist into API container...")
run_cmd(ssh, f"docker cp {REMOTE_TMP}/. {CONTAINER}:/app/dist/")

# Step 3: Restart
print("\n3. Restarting API container...")
run_cmd(ssh, f"docker restart {CONTAINER}")

# Step 4: Wait and check health
print("\n4. Waiting for API to start...")
time.sleep(12)
print("\n5. Checking API health...")
health = run_cmd(ssh, "curl -s http://localhost/api/health")

ssh.close()
print("\n" + "=" * 60)
print("  Deployment Complete!")
print("=" * 60)
