#!/usr/bin/env python3
"""Run migration on production VPS"""
import pexpect
import sys
import time

def run_ssh_command(command, timeout=120):
    """Run a command on the VPS via SSH"""
    child = pexpect.spawn(
        'ssh',
        ['-o', 'StrictHostKeyChecking=no', 'root@187.124.210.205', command],
        encoding='utf-8',
        timeout=timeout
    )
    
    try:
        i = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        
        if i == 0:
            child.sendline('TwentyOranges#2512')
            child.expect(pexpect.EOF, timeout=timeout)
        
        output = child.before if child.before else ''
        return output.strip()
    except Exception as e:
        return f"Error: {str(e)}"

def run_interactive_ssh(commands, timeout=300):
    """Run multiple commands in one SSH session"""
    child = pexpect.spawn(
        'ssh',
        ['-o', 'StrictHostKeyChecking=no', 'root@187.124.210.205'],
        encoding='utf-8',
        timeout=timeout
    )
    
    try:
        # Handle password
        i = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        if i == 0:
            child.sendline('TwentyOranges#2512')
            child.expect('#', timeout=30)
        
        # Run commands
        for cmd in commands:
            print(f"\n>>> Running: {cmd}")
            child.sendline(cmd)
            child.expect('#', timeout=timeout)
            print(child.before.strip())
        
        child.sendline('exit')
        child.expect(pexpect.EOF)
        
    except Exception as e:
        print(f"Error: {str(e)}")

print("=" * 60)
print("  Running Platform Feedback Migration on Production")
print("=" * 60)

# Check Docker container is running
print("\n1. Checking API container...")
output = run_ssh_command("docker ps --filter name=groomlink-api --format '{{.Status}}'")
print(f"   Status: {output}")

if 'up' not in output.lower():
    print("   ERROR: API container is not running!")
    sys.exit(1)

# Run migration
print("\n2. Running Prisma migration...")
commands = [
    "cd /tmp",
    "docker exec groomlink-api sh -c 'cd /app && cat > /tmp/migration.sql << EOF'",
    "-- This will be replaced",
    "EOF",
]

# Better approach: run migration directly via docker exec
print("\n2. Creating migration in container...")
migration_sql = """CREATE TABLE IF NOT EXISTS \"platform_feedback\" (
    \"id\" UUID NOT NULL DEFAULT gen_random_uuid(),
    \"rating\" INTEGER NOT NULL,
    \"comment\" TEXT,
    \"user_type\" VARCHAR NOT NULL,
    \"user_id\" UUID,
    \"email\" VARCHAR,
    \"device_id\" VARCHAR,
    \"app_version\" VARCHAR,
    \"status\" VARCHAR NOT NULL DEFAULT 'NEW',
    \"created_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \"updated_at\" TIMESTAMP(3) NOT NULL,
    CONSTRAINT \"platform_feedback_pkey\" PRIMARY KEY (\"id\")
);

CREATE INDEX IF NOT EXISTS \"platform_feedback_user_type_idx\" ON \"platform_feedback\"(\"user_type\");
CREATE INDEX IF NOT EXISTS \"platform_feedback_rating_idx\" ON \"platform_feedback\"(\"rating\");
CREATE INDEX IF NOT EXISTS \"platform_feedback_status_idx\" ON \"platform_feedback\"(\"status\");
CREATE INDEX IF NOT EXISTS \"platform_feedback_created_at_idx\" ON \"platform_feedback\"(\"created_at\");"""

# Use docker exec to run SQL directly
run_interactive_ssh([
    f"docker exec groomlink-api sh -c 'echo \"{migration_sql}\" > /tmp/feedback_migration.sql'",
    "docker exec groomlink-api sh -c 'cat /tmp/feedback_migration.sql'",
])

print("\n" + "=" * 60)
print("  Migration Complete!")
print("=" * 60)
print("\nNext steps:")
print("1. Rebuild and restart API to include new controller/routes")
print("2. Deploy admin web app with feedback page")
print("3. Rebuild mobile apps (already have feedback screens)")
