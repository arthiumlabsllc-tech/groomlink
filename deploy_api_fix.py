#!/usr/bin/env python3
"""Deploy API booking fix to VPS via paramiko"""
import paramiko
import os
import stat

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"
CONTAINER = "groomlink-api"

LOCAL_DIST = os.path.join(os.path.dirname(__file__), "services", "api", "dist")

def main():
    print("=" * 60)
    print("  Deploying API booking fix to VPS")
    print("=" * 60)

    # Connect
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
            print(f"    {out[:300]}")
        if err:
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

    # Step 1: Upload the compiled dist/controllers directory
    print("\n1. Uploading compiled API dist to VPS /tmp/api-dist...")
    run("rm -rf /tmp/api-dist")
    upload_dir(LOCAL_DIST, "/tmp/api-dist")
    print("   Uploaded!")

    # Step 2: Copy dist into the running container
    print("\n2. Copying dist into API container...")
    run(f"docker cp /tmp/api-dist/. {CONTAINER}:/app/dist/")

    # Step 3: Restart the container
    print("\n3. Restarting API container...")
    run(f"docker restart {CONTAINER}", timeout=30)

    # Step 4: Wait and check health
    print("\n4. Waiting 15s for API to start...")
    import time
    time.sleep(15)

    print("\n5. Checking API health...")
    out, _ = run("curl -s http://localhost/api/health")

    print("\n6. Checking container status...")
    run(f"docker ps --filter name={CONTAINER} --format '{{{{.Status}}}}'")

    sftp.close()
    ssh.close()

    print("\n" + "=" * 60)
    print("  Deployment Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
