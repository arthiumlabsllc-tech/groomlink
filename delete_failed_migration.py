#!/usr/bin/env python3
"""Delete the failed migration and let Prisma create a fresh one."""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.124.210.205', username='root', password='KilltheOranges#2512', timeout=15)

print("Checking current migration status...")
_, out, _ = ssh.exec_command(
    'docker exec -i groomlink-postgres psql -U groomlink -d groomlink -c "SELECT id, migration_name, finished_at, rolled_back_at FROM \\"_prisma_migrations\\" ORDER BY started_at DESC;"',
    timeout=10
)
print(out.read().decode())

print("\nDeleting the failed migration record...")
_, out2, _ = ssh.exec_command(
    'docker exec -i groomlink-postgres psql -U groomlink -d groomlink -c "DELETE FROM \\"_prisma_migrations\\" WHERE migration_name = \'20260512_add_live_chat_support\';"',
    timeout=10
)
print(out2.read().decode())

print("\nVerifying deletion...")
_, out3, _ = ssh.exec_command(
    'docker exec -i groomlink-postgres psql -U groomlink -d groomlink -c "SELECT id, migration_name, finished_at FROM \\"_prisma_migrations\\" ORDER BY started_at DESC;"',
    timeout=10
)
print(out3.read().decode())

print("\nRestarting API to let it apply the migration...")
_, out4, _ = ssh.exec_command(
    'cd /opt/groomlink && docker compose -f docker-compose.prod.yml restart api',
    timeout=120
)
print(out4.read().decode())

time.sleep(15)

print("\nChecking API status...")
_, out5, _ = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" | grep api')
status = out5.read().decode()
print(status)

if 'healthy' in status:
    print("\n✅ API is healthy!")
    print("\nTesting guest chat...")
    _, out6, _ = ssh.exec_command(
        'curl -s -X POST https://groomlinkgh.com/api/guest/support/tickets '
        '-H "Content-Type: application/json" '
        '-d \'{"guestName":"Test","guestEmail":"test@example.com","message":"Hello!"}\'',
        timeout=10
    )
    print(out6.read().decode())

ssh.close()
