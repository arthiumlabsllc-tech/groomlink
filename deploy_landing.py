#!/usr/bin/env python3
"""Deploy landing page to VPS using paramiko (SFTP + SSH)"""
import paramiko
import os
import stat

VPS_HOST = "187.124.210.205"
VPS_USER = "root"
VPS_PASS = "TwentyOranges#2512"
LOCAL_LANDING = os.path.join(os.path.dirname(__file__), "apps", "landing")
LOCAL_DIST = os.path.join(LOCAL_LANDING, "dist")
REMOTE_LANDING = "/root/GroomLink/apps/landing"

def run_ssh_command(ssh, cmd):
    print(f"  > {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(f"    {out}")
    if err and exit_code != 0:
        print(f"    ERROR: {err}")
    return exit_code, out, err

def upload_dir_recursive(sftp, local_dir, remote_dir):
    """Upload a directory recursively via SFTP"""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except FileNotFoundError:
                sftp.mkdir(remote_path)
            upload_dir_recursive(sftp, local_path, remote_path)
        else:
            size = os.path.getsize(local_path)
            print(f"    Uploading {item} ({size:,} bytes)")
            sftp.put(local_path, remote_path)

def main():
    # Check local dist exists
    if not os.path.isdir(LOCAL_DIST):
        print("ERROR: dist/ not found. Run 'npx vite build' in apps/landing first.")
        return

    print("=" * 60)
    print("  DEPLOYING LANDING PAGE TO VPS")
    print("=" * 60)

    # Connect
    print("\n[1/5] Connecting to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    sftp = ssh.open_sftp()
    print("  Connected!")

    # Ensure remote directory exists
    print("\n[2/5] Preparing remote directory...")
    run_ssh_command(ssh, f"mkdir -p {REMOTE_LANDING}/dist")
    # Clean old dist
    run_ssh_command(ssh, f"rm -rf {REMOTE_LANDING}/dist/*")

    # Upload dist files
    print("\n[3/5] Uploading built files...")
    upload_dir_recursive(sftp, LOCAL_DIST, f"{REMOTE_LANDING}/dist")

    # Upload Dockerfile and nginx.conf
    print("\n[4/5] Uploading Dockerfile and nginx.conf...")
    sftp.put(os.path.join(LOCAL_LANDING, "Dockerfile"), f"{REMOTE_LANDING}/Dockerfile")
    sftp.put(os.path.join(LOCAL_LANDING, "nginx.conf"), f"{REMOTE_LANDING}/nginx.conf")
    # Also upload package.json (needed for Docker build)
    sftp.put(os.path.join(LOCAL_LANDING, "package.json"), f"{REMOTE_LANDING}/package.json")
    print("  Done!")

    sftp.close()

    # Rebuild and restart container
    print("\n[5/5] Rebuilding Docker container...")
    # Since we already have the dist, create a simpler Dockerfile that just copies dist into nginx
    simple_dockerfile = (
        'FROM nginx:alpine\n'
        'COPY dist /usr/share/nginx/html\n'
        'COPY nginx.conf /etc/nginx/conf.d/default.conf\n'
        'EXPOSE 80\n'
        'CMD ["nginx", "-g", "daemon off;"]\n'
    )
    # Write the simple Dockerfile remotely
    run_ssh_command(ssh, f"cat > {REMOTE_LANDING}/Dockerfile.deploy << 'EOFDF'\n{simple_dockerfile}EOFDF")

    # Build new image from the pre-built dist
    run_ssh_command(ssh, f"cd {REMOTE_LANDING} && docker build -f Dockerfile.deploy -t groomlink-landing:latest .")

    # Stop old container and start new one
    print("\n  Restarting container...")
    run_ssh_command(ssh, "docker stop groomlink-landing 2>/dev/null; docker rm groomlink-landing 2>/dev/null")
    exit_code, out, err = run_ssh_command(
        ssh,
        "docker run -d --name groomlink-landing --restart always "
        "-p 8081:80 --network groomlink-network "
        "groomlink-landing:latest"
    )

    # Verify
    print("\n  Verifying deployment...")
    run_ssh_command(ssh, "docker ps --filter name=groomlink-landing --format '{{.Status}}'")

    ssh.close()

    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE!")
    print("  Landing page: https://groomlinkgh.com")
    print("=" * 60)

if __name__ == "__main__":
    main()
