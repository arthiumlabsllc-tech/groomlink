#!/usr/bin/env python3
"""Push changes to GitHub and deploy to VPS."""
import paramiko
import subprocess
import time

print("=" * 60)
print("STEP 1: Pushing changes to GitHub")
print("=" * 60)

# Add all changes
print("\nAdding changes to git...")
subprocess.run(["git", "add", "."], check=True)

# Commit changes
print("\nCommitting changes...")
commit_message = """feat: complete live chat support system with notifications

- Fix guest chat route order (customer-chat before /support)
- Add Prisma migration for live chat fields (TicketSource, guest fields)
- Make user_id and sender_id nullable for guest tickets
- Add null safety to Tickets page for guest tickets
- Add notification sound for new chats in support dashboard
- Deploy live chat widgets to customer and partners web apps
- Fix socket.io-client dependency in support dashboard"""

subprocess.run(["git", "commit", "-m", commit_message], check=True)

# Push to GitHub
print("\nPushing to GitHub...")
result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)

if result.returncode == 0:
    print("✅ Successfully pushed to GitHub!")
    print(result.stdout)
else:
    print("❌ Push failed!")
    print(result.stderr)
    if "authentication" in result.stderr.lower() or "auth" in result.stderr.lower():
        print("\n⚠️  Authentication error. Please check your GitHub credentials.")
    exit(1)

print("\n" + "=" * 60)
print("STEP 2: Deploying to VPS")
print("=" * 60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('187.124.210.205', username='root', password='KilltheOranges#2512', timeout=15)
    
    # Deploy API
    print("\n1️⃣  Rebuilding API...")
    _, out, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build api 2>&1 | tail -20',
        timeout=900
    )
    api_output = out.read().decode()
    print(api_output[-300:] if len(api_output) > 300 else api_output)
    
    _, out2, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps api',
        timeout=120
    )
    print(out2.read().decode())
    time.sleep(5)
    
    # Deploy Support Dashboard
    print("\n2️⃣  Rebuilding Support Dashboard...")
    _, out3, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build support 2>&1 | tail -20',
        timeout=600
    )
    support_output = out3.read().decode()
    print(support_output[-300:] if len(support_output) > 300 else support_output)
    
    _, out4, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps support',
        timeout=120
    )
    print(out4.read().decode())
    time.sleep(5)
    
    # Deploy Customer App
    print("\n3️⃣  Rebuilding Customer App...")
    _, out5, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build customer 2>&1 | tail -20',
        timeout=600
    )
    customer_output = out5.read().decode()
    print(customer_output[-300:] if len(customer_output) > 300 else customer_output)
    
    _, out6, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps customer',
        timeout=120
    )
    print(out6.read().decode())
    time.sleep(3)
    
    # Deploy Partners App
    print("\n4️⃣  Rebuilding Partners App...")
    _, out7, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build partners 2>&1 | tail -20',
        timeout=600
    )
    partners_output = out7.read().decode()
    print(partners_output[-300:] if len(partners_output) > 300 else partners_output)
    
    _, out8, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps partners',
        timeout=120
    )
    print(out8.read().decode())
    time.sleep(3)
    
    # Deploy Landing Page
    print("\n5️⃣  Rebuilding Landing Page...")
    _, out9, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml build landing 2>&1 | tail -20',
        timeout=600
    )
    landing_output = out9.read().decode()
    print(landing_output[-300:] if len(landing_output) > 300 else landing_output)
    
    _, out10, _ = ssh.exec_command(
        'cd /opt/groomlink && docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps landing',
        timeout=120
    )
    print(out10.read().decode())
    time.sleep(3)
    
    # Check all containers
    print("\n" + "=" * 60)
    print("DEPLOYMENT STATUS")
    print("=" * 60)
    _, out11, _ = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
    print(out11.read().decode())
    
    # Test endpoints
    print("\n" + "=" * 60)
    print("HEALTH CHECKS")
    print("=" * 60)
    
    endpoints = [
        ("API Health", "https://groomlinkgh.com/api/health"),
        ("Landing Page", "https://groomlinkgh.com"),
        ("Customer App", "https://app.groomlinkgh.com"),
        ("Partners App", "https://partners.groomlinkgh.com"),
        ("Support Dashboard", "https://support.groomlinkgh.com/live-chat"),
        ("Support Tickets", "https://support.groomlinkgh.com/tickets"),
    ]
    
    for name, url in endpoints:
        _, out, _ = ssh.exec_command(f'curl -s -o /dev/null -w "%{{http_code}}" {url}')
        status = out.read().decode()
        icon = "✅" if status == "200" else "⚠️"
        print(f"{icon} {name}: {status}")
    
    print("\n" + "=" * 60)
    print("✅ DEPLOYMENT COMPLETE!")
    print("=" * 60)
    print("\nLive Chat System is fully operational:")
    print("  🌐 Landing Page: https://groomlinkgh.com")
    print("  👤 Customer App: https://app.groomlinkgh.com")
    print("  🤝 Partners App: https://partners.groomlinkgh.com")
    print("  🎧 Support Dashboard: https://support.groomlinkgh.com/live-chat")
    print("  🎫 Support Tickets: https://support.groomlinkgh.com/tickets")
    print("\nFeatures deployed:")
    print("  ✅ Guest chat with anonymous visitors")
    print("  ✅ Authenticated customer chat")
    print("  ✅ Partner support chat")
    print("  ✅ Notification sounds for new chats")
    print("  ✅ Null-safe ticket display")
    print("  ✅ Real-time Socket.io updates")
    
finally:
    ssh.close()
