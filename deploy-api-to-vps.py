#!/usr/bin/env python3
"""Deploy API to production VPS - sync dist folder and restart"""
import pexpect
import sys

VPS_USER = "root"
VPS_HOST = "187.124.210.205"
PASSWORD = "TwentyOranges#2512"

def ssh_command(command, timeout=60):
    """Run single SSH command"""
    child = pexpect.spawn(
        'ssh',
        ['-o', 'StrictHostKeyChecking=no', f'{VPS_USER}@{VPS_HOST}'],
        encoding='utf-8',
        timeout=timeout
    )
    
    try:
        child.expect('password:', timeout=30)
        child.sendline(PASSWORD)
        child.expect('#', timeout=30)
        
        child.sendline(command)
        child.expect('#', timeout=timeout)
        output = child.before.strip()
        
        child.sendline('exit')
        child.expect(pexpect.EOF)
        
        return output
    except Exception as e:
        return f"Error: {str(e)}"

print("=" * 70)
print("  Deploying API with Feedback System")
print("=" * 70)

# Step 1: Sync dist folder to VPS
print("\n1. Syncing API build to VPS...")
child = pexpect.spawn(
    'rsync',
    ['-avz', '--delete', '-e', 'ssh -o StrictHostKeyChecking=no',
     'services/api/dist/', f'{VPS_USER}@{VPS_HOST}:/tmp/api-dist/'],
    encoding='utf-8',
    timeout=120
)

try:
    child.expect('password:', timeout=30)
    child.sendline(PASSWORD)
    child.expect(pexpect.EOF, timeout=120)
    print("✅ API build synced")
except Exception as e:
    print(f"❌ Failed to sync: {str(e)}")
    sys.exit(1)

# Step 2: Copy dist into container
print("\n2. Copying build into API container...")
output = ssh_command("docker cp /tmp/api-dist/. groomlink-api:/app/dist/")
print(output[:200] if len(output) > 200 else output)

# Step 3: Copy prisma schema
print("\n3. Updating Prisma schema in container...")
output = ssh_command("docker cp services/api/prisma/schema.prisma groomlink-api:/app/prisma/schema.prisma")
print(output[:200] if len(output) > 200 else output)

# Step 4: Copy package.json
print("\n4. Copying package.json...")
output = ssh_command("docker cp services/api/package.json groomlink-api:/app/package.json")
print(output[:200] if len(output) > 200 else output)

# Step 5: Generate Prisma client inside container
print("\n5. Generating Prisma client...")
output = ssh_command("docker exec groomlink-api sh -c 'cd /app && npx prisma generate'")
lines = output.split('\n')
for line in lines[-5:]:
    print(line)

# Step 6: Restart API container
print("\n6. Restarting API container...")
output = ssh_command("docker restart groomlink-api")
print(output[:200] if len(output) > 200 else output)

# Step 7: Wait and check health
print("\n7. Waiting for API to start...")
import time
time.sleep(15)

print("\n8. Checking API health...")
output = ssh_command("curl -s http://localhost/api/health")
print(output)

print("\n" + "=" * 70)
print("  ✅ API Deployment Complete!")
print("=" * 70)
print("\nThe feedback system is now live on production!")
print("\nAPI Endpoints:")
print("  POST   https://groomlinkgh.com/api/platform/feedback")
print("  GET    https://groomlinkgh.com/api/platform/feedback (admin)")
print("  GET    https://groomlinkgh.com/api/platform/feedback/stats (admin)")
print("  PATCH  https://groomlinkgh.com/api/platform/feedback/:id (admin)")
