import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('187.124.210.205', username='root', password='TwentyOranges#2512')
stdin, stdout, stderr = ssh.exec_command('docker ps --filter name=groomlink-api --format "{{.Status}}" && curl -s http://localhost:5000/api/health')
print(stdout.read().decode())
ssh.close()
