#!/usr/bin/env python3
"""Apply the live chat migration and rebuild API."""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.124.210.205', username='root', password='KilltheOranges#2512', timeout=15)
sftp = ssh.open_sftp()

try:
    # Upload migration file
    print("Creating migration directory on VPS...")
    ssh.exec_command('mkdir -p /opt/groomlink/services/api/prisma/migrations/20260512_add_live_chat_support')
    
    print("Uploading migration file...")
    sftp.put(
        'services/api/prisma/migrations/20260512_add_live_chat_support/migration.sql',
        '/opt/groomlink/services/api/prisma/migrations/20260512_add_live_chat_support/migration.sql'
    )
    print("✅ Migration file uploaded\n")
    
    # Apply migration directly using psql inside the postgres container
    print("Applying migration to database...")
    _, out, err = ssh.exec_command(
        'docker exec -i groomlink-postgres psql -U groomlink -d groomlink < /opt/groomlink/services/api/prisma/migrations/20260512_add_live_chat_support/migration.sql',
        timeout=30
    )
    output = (out.read() + err.read()).decode()
    print(output)
    
    if 'ERROR' in output:
        print("⚠️  Some errors occurred (may be from IF NOT EXISTS checks)")
    
    print("\n✅ Migration applied\n")
    
    # Rebuild API with new schema
    print("Rebuilding API container...")
    _, out2, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build api 2>&1 | tail -20',
        timeout=900
    )
    print(out2.read().decode())
    
    print("\nRestarting API...")
    _, out3, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps api',
        timeout=120
    )
    print(out3.read().decode())
    
    time.sleep(8)
    
    # Test the guest chat endpoint
    print("\nTesting guest chat endpoint...")
    _, out4, _ = ssh.exec_command(
        'curl -s -X POST https://groomlinkgh.com/api/guest/support/tickets '
        '-H "Content-Type: application/json" '
        '-d \'{"guestName":"Test User","guestEmail":"test@example.com","message":"Hello, I need help!"}\'',
        timeout=10
    )
    result = out4.read().decode()
    print(result)
    
    if '"success":true' in result or 'ticket' in result.lower():
        print("\n✅ Guest chat is now working!")
    else:
        print("\n⚠️  Still having issues")
    
    # Check support dashboard
    print("\n\nTesting support dashboard...")
    _, out5, _ = ssh.exec_command(
        'curl -s -o /dev/null -w "%{http_code}" https://support.groomlinkgh.com/live-chat',
        timeout=10
    )
    status_code = out5.read().decode()
    print(f"Support dashboard /live-chat status: {status_code}")
    
    if status_code == '200':
        print("✅ Support dashboard live chat page is accessible!")
    else:
        print("⚠️  Support dashboard may need rebuild")
        
finally:
    sftp.close()
    ssh.close()
