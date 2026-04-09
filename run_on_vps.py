#!/usr/bin/env python3
"""Run commands on VPS via SSH with pexpect"""
import pexpect
import sys
import re

def run_command(command):
    """Run a command on the VPS"""
    child = pexpect.spawn('ssh', ['-o', 'StrictHostKeyChecking=no', 
                                   'root@187.124.210.205', 
                                   command],
                          encoding='utf-8', 
                          timeout=600)
    
    try:
        # Wait for password prompt
        i = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT], timeout=30)
        
        if i == 0:
            # Password prompt found, send password
            child.sendline('TwentyOranges#2512')
            # Wait for command to complete
            child.expect(pexpect.EOF, timeout=600)
        
        output = child.before if child.before else ''
        
        # Clean up ANSI escape codes
        output = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', output)
        output = re.sub(r'\x1b\].*?\x07', '', output)
        output = re.sub(r'\r', '', output)
        
        return output.strip()
    except pexpect.TIMEOUT as e:
        return f"Error: Timeout - {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = ' '.join(sys.argv[1:])
    else:
        cmd = 'echo "Connection successful"'
    
    print(f"Running: {cmd}")
    print("-" * 50)
    result = run_command(cmd)
    print(result)
    print("-" * 50)
