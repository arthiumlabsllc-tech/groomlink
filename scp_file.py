#!/usr/bin/env python3
import pexpect
import sys

def scp_file(local_path, remote_path):
    """Copy a file to the VPS via SCP"""
    scp_command = f"scp -o StrictHostKeyChecking=no {local_path} root@187.124.210.205:{remote_path}"
    child = pexpect.spawn(scp_command, encoding='utf-8', timeout=60)
    
    try:
        child.expect('password:')
        child.sendline('TwentyOranges#2512')
        child.expect(pexpect.EOF, timeout=60)
        output = child.before
        return output
    except pexpect.TIMEOUT:
        return f"Error: Timeout waiting for response"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        local_path = sys.argv[1]
        remote_path = sys.argv[2]
    else:
        print("Usage: scp_file.py <local_path> <remote_path>")
        sys.exit(1)
    
    result = scp_file(local_path, remote_path)
    print(result)
