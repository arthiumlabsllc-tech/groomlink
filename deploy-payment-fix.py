#!/usr/bin/env python3
"""Quick deploy payment fix - git pull + rebuild on VPS"""
import paramiko

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASSWORD = "TwentyOranges#2512"
PROJECT_DIR = "/opt/groomlink"

def main():
    print("=" * 60)
    print("  Deploying Payment Fix to VPS")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("\nConnecting to VPS...")
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASSWORD)
    print("Connected!")

    def run(cmd, timeout=120):
        print(f"  > {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        if out:
            print(f"    {out[:500]}")
        if err and err != out:
            print(f"    STDERR: {err[:500]}")
        return out, err

    # Step 1: Git pull
    print("\n1. Pulling latest code...")
    run(f"cd {PROJECT_DIR} && git pull origin main", timeout=30)

    # Step 2: Rebuild API container
    print("\n2. Rebuilding API container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml build api", timeout=120)

    # Step 3: Restart API container
    print("\n3. Restarting API container...")
    run(f"cd {PROJECT_DIR} && docker compose -f docker-compose.prod.yml up -d api", timeout=60)

    # Step 4: Wait and check
    print("\n4. Waiting 10s for API to start...")
    import time
    time.sleep(10)

    print("\n5. Checking API health...")
    run("curl -s http://localhost/api/health || echo 'Health check failed'")

    print("\n6. Checking container status...")
    run("docker ps --filter name=groomlink-api --format '{{.Status}}'")

    ssh.close()
    print("\n" + "=" * 60)
    print("  Deployment Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
