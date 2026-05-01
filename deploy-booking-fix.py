#!/usr/bin/env python3
"""
Deploy booking total calculation fix to VPS
This script handles the password authentication automatically
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

def get_vps_password():
    """Get VPS password from environment or prompt user"""
    password = os.environ.get("VPS_PASSWORD")
    if not password:
        password = input(f"Enter VPS password for {VPS_USER}@{VPS_HOST}: ")
    return password

def deploy_booking_fix():
    """Deploy the booking service fix to VPS"""
    
    print("=" * 60)
    print("🚀 Deploying Booking Total Calculation Fix")
    print("=" * 60)
    
    # Verify dist directory exists
    if not API_DIST_DIR.exists():
        print(f"❌ Error: dist directory not found at {API_DIST_DIR}")
        print("   Please run 'npm run build' in services/api first")
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
        
        # Step 1: Create temp directory
        print("\n📁 Creating temporary directory...")
        stdin, stdout, stderr = ssh.exec_command("mkdir -p /tmp/api-dist")
        if stdout.channel.recv_exit_status() != 0:
            print("❌ Failed to create temp directory")
            sys.exit(1)
        print("✅ Temp directory created")
        
        # Step 2: Upload files via SFTP
        print("\n📤 Uploading API files...")
        sftp = ssh.open_sftp()
        
        uploaded_count = 0
        for root_dir, dirs, files in os.walk(API_DIST_DIR):
            for file in files:
                local_path = Path(root_dir) / file
                relative_path = local_path.relative_to(API_DIST_DIR)
                remote_path = f"/tmp/api-dist/{relative_path}"
                
                # Create remote directory if needed
                remote_dir = str(Path(remote_path).parent)
                try:
                    sftp.stat(remote_dir)
                except FileNotFoundError:
                    sftp.mkdir(remote_dir)
                
                sftp.put(str(local_path), remote_path)
                uploaded_count += 1
                
                if uploaded_count % 50 == 0:
                    print(f"   Uploaded {uploaded_count} files...")
        
        sftp.close()
        print(f"✅ Uploaded {uploaded_count} files")
        
        # Step 3: Copy files to Docker container
        print(f"\n🐳 Copying files to {CONTAINER_NAME} container...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker cp /tmp/api-dist/. {CONTAINER_NAME}:/app/dist/"
        )
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error_msg = stderr.read().decode()
            print(f"❌ Failed to copy files: {error_msg}")
            sys.exit(1)
        print("✅ Files copied to container")
        
        # Step 4: Restart container
        print("\n🔄 Restarting API container...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker restart {CONTAINER_NAME}"
        )
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error_msg = stderr.read().decode()
            print(f"❌ Failed to restart container: {error_msg}")
            sys.exit(1)
        print("✅ Container restarted")
        
        # Step 5: Wait for container to be healthy
        print("\n⏳ Waiting for container to be healthy...")
        import time
        time.sleep(10)
        
        stdin, stdout, stderr = ssh.exec_command(
            "docker ps --filter name=groomlink-api --format '{{.Status}}'"
        )
        status = stdout.read().decode().strip()
        print(f"   Container status: {status}")
        
        # Step 6: Verify fix is deployed
        print("\n🔍 Verifying booking fix deployment...")
        stdin, stdout, stderr = ssh.exec_command(
            f"docker exec {CONTAINER_NAME} grep -n 'guestServiceIds' /app/dist/services/booking.service.js"
        )
        verification = stdout.read().decode().strip()
        
        if verification:
            print("✅ Booking total calculation fix VERIFIED in container!")
            print(f"   Found at: {verification}")
        else:
            print("⚠️  Warning: Could not verify fix deployment")
            print("   Please manually check the booking.service.js file")
        
        # Step 7: Test health endpoint
        print("\n🏥 Testing API health...")
        stdin, stdout, stderr = ssh.exec_command(
            "curl -s http://localhost/api/health | head -20"
        )
        health_response = stdout.read().decode().strip()
        if health_response:
            print(f"✅ API Health: {health_response}")
        else:
            print("⚠️  Could not reach health endpoint")
        
        print("\n" + "=" * 60)
        print("🎉 Deployment Complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Open customer app")
        print("2. Create a group booking with 2-3 guests")
        print("3. Verify total = primary service + all guest services")
        print("4. Check price breakdown on confirmation screen")
        print("\nSee BOOKING_TOTAL_TEST_GUIDE.md for detailed test scenarios")
        
    except paramiko.AuthenticationException:
        print("❌ Authentication failed. Please check your password.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"❌ SSH error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    deploy_booking_fix()
