#!/bin/bash

# GroomLink Backup Script
# Usage: ./backup.sh [daily|weekly]

set -e

BACKUP_TYPE=${1:-daily}
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/groomlink"
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== GroomLink Backup ===${NC}"
echo "Type: $BACKUP_TYPE"
echo "Date: $DATE"
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo -e "${GREEN}Backing up database...${NC}"
docker exec groomlink-postgres pg_dump -U groomlink_prod groomlink_prod | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Redis backup (if needed)
echo -e "${GREEN}Backing up Redis...${NC}"
docker exec groomlink-redis redis-cli BGSAVE
sleep 2
docker cp groomlink-redis:/data/dump.rdb "$BACKUP_DIR/redis_${DATE}.rdb"

# Application files backup
echo -e "${GREEN}Backing up application files...${NC}"
tar -czf "$BACKUP_DIR/app_${DATE}.tar.gz" -C /opt/groomlink \
    .env.production \
    docker-compose.prod.yml \
    nginx/ \
    2>/dev/null || true

# Clean old backups
echo -e "${GREEN}Cleaning old backups (older than $RETENTION_DAYS days)...${NC}"
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# List backups
echo ""
echo -e "${GREEN}Backup completed!${NC}"
echo "Backup files:"
ls -lh $BACKUP_DIR | tail -5

echo ""
echo "Backup location: $BACKUP_DIR"
echo "To restore database: gunzip < $BACKUP_DIR/db_${DATE}.sql.gz | docker exec -i groomlink-postgres psql -U groomlink_prod -d groomlink_prod"
