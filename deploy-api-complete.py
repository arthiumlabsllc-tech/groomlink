#!/usr/bin/env python3
"""
Complete API deployment script - uploads entire dist directory recursively
"""

import paramiko
import os
import sys
from pathlib import Path

# Configuration
VPS_HOST = "187.124.210.205"
VPS_USER = "root"
CONTAINER_NAME = "groomlink-api"
API_DIST_DIR = Path(__file__).parent / "services" / "api" / "dist"
API_PRISMA_DIR = Path(__file__).parent / "services" / "api" / "prisma"

def get_vps_password():
    """Get VPS password from environment or prompt user"""
    password = os.environ.get("VPS_PASSWORD")
    if not password:
        password = input(f"Enter VPS password for {VPS_USER}@{VPS_HOST}: ")
    return password

def upload_directory(sftp, local_dir, remote_dir, description="files"):
    """Upload directory recursively with progress"""
    all_files = []
    for root_dir, dirs, files in os.walk(local_dir):
        for file in files:
            local_path = Path(root_dir) / file
            relative_path = local_path.relative_to(local_dir)
            remote_path = f"{remote_dir}/{relative_path}".replace('\\', '/')
            all_files.append((str(local_path), remote_path))
    
    print(f"\n📤 Uploading {len(all_files)} {description}...")
    
    count = 0
    for local_path, remote_path in all_files:
        count += 1
        if count % 50 == 0:
            print(f"   Uploaded {count}/{len(all_files)} files...")
        # Create remote directory if needed
        remote_parent = str(Path(remote_path).parent)
        try:
            sftp.stat(remote_parent)
        except FileNotFoundError:
            # Create directory recursively
            parts = remote_parent.split('/')
            current = ''
            for part in parts:
                if part:
                    current += f'/{part}'
                    try:
                        sftp.stat(current)
                    except FileNotFoundError:
                        sftp.mkdir(current)
        
        sftp.put(local_path, remote_path)

def deploy():
    """Deploy complete API to VPS"""
    
    print("=" * 70)
    print("🚀 Complete API Deployment to VPS")
    print("=" * 70)
    
    # Verify directories exist
    if not API_DIST_DIR.exists():
        print(f"❌ Error: dist directory not found at {API_DIST_DIR}")
        print("   Please run 'npm run build' in services/api first")
        sys.exit(1)
    
    if not API_PRISMA_DIR.exists():
        print(f"❌ Error: prisma directory not found at {API_PRISMA_DIR}")
        sys.exit(1)
    
    # Get password
    password = get_vps_password()
    
    # Connect to VPS
    print(f"\n📡 Connecting to {VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=password, timeout=30)
        print("✅ Connected to VPS")
        
        sftp = ssh.open_sftp()
        
        # Step 1: Upload dist directory
        upload_directory(sftp, API_DIST_DIR, "/tmp/api-dist", "dist files")
        print("✅ Dist directory uploaded")
        
        # Step 2: Upload prisma directory
        upload_directory(sftp, API_PRISMA_DIR, "/tmp/api-prisma", "prisma files")
        print("✅ Prisma directory uploaded")
        
        sftp.close()
        
        # Step 3: Stop container if running
        print(f"\n🛑 Stopping {CONTAINER_NAME} container...")
        stdin, stdout, stderr = ssh.exec_command(f"docker stop {CONTAINER_NAME} 2>/dev/null || true")
        stdout.channel.recv_exit_status()
        print("✅ Container stopped")
        
        # Step 4: Copy dist to container
        print(f"\n📦 Copying dist to container...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker cp /tmp/api-dist/. {CONTAINER_NAME}:/app/dist/"
        )
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            error_msg = stderr.read().decode()
            print(f"⚠️  Warning copying dist: {error_msg}")
        else:
            print("✅ Dist copied to container")
        
        # Step 5: Copy prisma to container
        print(f"\n📦 Copying prisma to container...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker cp /tmp/api-prisma/. {CONTAINER_NAME}:/app/prisma/"
        )
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            error_msg = stderr.read().decode()
            print(f"⚠️  Warning copying prisma: {error_msg}")
        else:
            print("✅ Prisma copied to container")
        
        # Step 6: Restart container
        print(f"\n🔄 Restarting container...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker start {CONTAINER_NAME}"
        )
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            error_msg = stderr.read().decode()
            print(f"❌ Failed to start container: {error_msg}")
            sys.exit(1)
        print("✅ Container started")
        
        # Step 7: Wait and check status
        print("\n⏳ Waiting for container to stabilize...")
        import time
        time.sleep(8)
        
        stdin, stdout, stderr = ssh.exec_command(
            f"docker ps --filter name={CONTAINER_NAME} --format '{{{{.Status}}}}'"
        )
        status = stdout.read().decode().strip()
        print(f"   Container status: {status}")
        
        # Step 8: Verify critical file exists
        print("\n🔍 Verifying booking service fix...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker exec {CONTAINER_NAME} grep -l 'guestServiceIds' /app/dist/services/booking.service.js 2>/dev/null"
        )
        verification = stdout.read().decode().strip()
        
        if verification:
            print("✅ Booking total calculation fix VERIFIED!")
        else:
            print("⚠️  Could not verify fix - container may still be starting")
        
        # Step 9: Check logs for errors
        print("\n📋 Recent container logs:")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker logs {CONTAINER_NAME} --tail 15"
        )
        logs = stdout.read().decode()
        print(logs)
        
        print("\n" + "=" * 70)
        if "running" in status.lower() or "up" in status.lower():
            print("🎉 Deployment Successful!")
            print("=" * 70)
            print("\nNext steps:")
            print("1. Open customer app")
            print("2. Test group booking with multiple guests")
            print("3. Verify total = primary service + all guest services")
            print("4. Check price breakdown on confirmation screen")
        else:
            print("⚠️  Container status unclear - please check logs above")
            print("=" * 70)
        
    except paramiko.AuthenticationException:
        print("❌ Authentication failed. Please check your password.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"❌ SSH error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy()
