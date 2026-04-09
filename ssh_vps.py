#!/usr/bin/env python3
import pexpect
import sys

def run_ssh_command(command):
    """Run a command on the VPS via SSH"""
    ssh_command = f"ssh -o StrictHostKeyChecking=no root@187.124.210.205"
    child = pexpect.spawn(ssh_command, encoding='utf-8', timeout=120)
    
    try:
        child.expect('password:')
        child.sendline('TwentyOranges#2512')
        # Wait for prompt or shell
        child.expect('#', timeout=30)
        # Send the command
        child.sendline(command)
        # Wait for next prompt
        child.expect('#', timeout=60)
        output = child.before
        # Exit
        child.sendline('exit')
        child.expect(pexpect.EOF)
        return output
    except pexpect.TIMEOUT:
        return f"Error: Timeout waiting for response"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = ' '.join(sys.argv[1:])
    else:
        command = "echo 'Connection successful'"
    
    result = run_ssh_command(command)
    print(result)
