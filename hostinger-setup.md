# Hostinger Deployment Guide for GroomLink

## Prerequisites

1. **Hostinger VPS Plan** (Recommended: VPS 2 or higher)
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - 20GB SSD storage

2. **Domain Name** (pointed to your Hostinger VPS IP)

## Step 1: Purchase and Setup Hostinger VPS

1. Go to [Hostinger](https://www.hostinger.com/vps-hosting)
2. Select VPS 2 plan (or higher for production)
3. Choose Ubuntu 22.04 LTS as OS
4. Complete purchase and wait for VPS provisioning
5. Note your VPS IP address from Hostinger dashboard

## Step 2: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

## Step 3: Run Deployment Script

```bash
# Download the deployment script
curl -O https://raw.githubusercontent.com/gr3enink-stack/automatic-bassoon/main/hostinger-deploy.sh
chmod +x hostinger-deploy.sh

# Run deployment
./hostinger-deploy.sh production
```

## Step 4: Configure Domain

### In Hostinger DNS Panel:
1. Go to Domains → DNS Zone Editor
2. Add A record:
   - Name: @
   - Points to: YOUR_VPS_IP
   - TTL: 14400

3. Add A record for www:
   - Name: www
   - Points to: YOUR_VPS_IP
   - TTL: 14400

4. Add A record for admin:
   - Name: admin
   - Points to: YOUR_VPS_IP
   - TTL: 14400

## Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Step 6: Environment Configuration

Edit the environment file:

```bash
nano /opt/groomlink/.env.production
```

Required variables:
```
DB_PASSWORD=your-secure-password
REDIS_PASSWORD=your-secure-password
JWT_SECRET=your-64-character-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Step 7: Update Nginx for SSL

Edit `/opt/groomlink/nginx/nginx.conf` and uncomment the HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    include /etc/nginx/conf.d/locations.conf;
}
```

Restart nginx:
```bash
cd /opt/groomlink && docker-compose restart nginx
```

## Hostinger Specific Optimizations

### 1. Enable Hostinger's DDoS Protection
- Go to Hostinger dashboard
- Enable DDoS protection for your VPS

### 2. Configure Backups
- Set up automated weekly backups in Hostinger panel
- Or use the built-in backup script:

```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /opt/groomlink/backup.sh
```

### 3. Monitor Resources
- Use Hostinger's monitoring dashboard
- Or install htop:
```bash
sudo apt-get install htop -y
htop
```

## Troubleshooting

### Check Service Status
```bash
cd /opt/groomlink
docker-compose ps
docker-compose logs api
docker-compose logs nginx
```

### Restart Services
```bash
cd /opt/groomlink
docker-compose restart
```

### View Real-time Logs
```bash
cd /opt/groomlink
docker-compose logs -f
```

### Database Access
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U groomlink_prod -d groomlink_prod
```

## Cost Estimation (Hostinger)

| Component | Monthly Cost |
|-----------|-------------|
| VPS 2 (2GB RAM, 20GB SSD) | ~$6.99 |
| Domain (.com) | ~$0.99 |
| SSL Certificate (Let's Encrypt) | Free |
| **Total** | **~$8/month** |

For production with higher traffic, consider VPS 4 (4GB RAM) at ~$12.99/month.
