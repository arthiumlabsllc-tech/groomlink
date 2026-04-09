#!/usr/bin/env python3
"""Sync local changes to VPS using rsync"""
import pexpect
import sys

def sync_to_vps():
    """Sync local files to VPS"""
    # Use rsync with SSH
    cmd = 'rsync -avz --exclude ".git" --exclude "node_modules" --exclude "dist" --exclude ".env*" /home/ubuntu/Desktop/GroomLink/ root@187.124.210.205:/opt/groomlink/'
    
    child = pexpect.spawn(cmd, encoding='utf-8', timeout=300)
    
    try:
        i = child.expect(['password:', 'yes/no', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        
        if i == 0:
            child.sendline('TwentyOranges#2512')
            child.expect(pexpect.EOF, timeout=300)
        elif i == 1:
            child.sendline('yes')
            child.expect('password:', timeout=30)
            child.sendline('TwentyOranges#2512')
            child.expect(pexpect.EOF, timeout=300)
        
        return child.before if child.before else 'Done'
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    print("Syncing files to VPS...")
    print("-" * 50)
    result = sync_to_vps()
    print(result)
