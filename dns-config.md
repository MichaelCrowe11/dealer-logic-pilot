# DNS Configuration for dealerlogic.io

## Required DNS Records

### Main Domain
```
Type: A
Name: @
Value: [YOUR_SERVER_IP]
TTL: 3600
```

```
Type: A
Name: www
Value: [YOUR_SERVER_IP]
TTL: 3600
```

### API Subdomain
```
Type: A
Name: api
Value: [YOUR_SERVER_IP]
TTL: 3600
```

### Webhooks Subdomain
```
Type: A
Name: hooks
Value: [YOUR_SERVER_IP]
TTL: 3600
```

### Dashboard Subdomain
```
Type: A
Name: dashboard
Value: [YOUR_SERVER_IP]
TTL: 3600
```

## Cloudflare Configuration (if using Cloudflare)

1. **SSL/TLS Settings**
   - Mode: Full (strict)
   - Always Use HTTPS: ON
   - Automatic HTTPS Rewrites: ON

2. **Page Rules**
   - `api.dealerlogic.io/*` - Cache Level: Bypass
   - `hooks.dealerlogic.io/*` - Cache Level: Bypass

3. **Security Settings**
   - Web Application Firewall: ON
   - DDoS Protection: ON
   - Rate Limiting: Configure for API endpoints

## NGINX Configuration

```nginx
# Main site
server {
    listen 80;
    listen [::]:80;
    server_name dealerlogic.io www.dealerlogic.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dealerlogic.io www.dealerlogic.io;
    
    ssl_certificate /etc/letsencrypt/live/dealerlogic.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dealerlogic.io/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.dealerlogic.io;
    
    ssl_certificate /etc/letsencrypt/live/api.dealerlogic.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.dealerlogic.io/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Webhooks
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hooks.dealerlogic.io;
    
    ssl_certificate /etc/letsencrypt/live/hooks.dealerlogic.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hooks.dealerlogic.io/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL Certificate Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d dealerlogic.io -d www.dealerlogic.io
sudo certbot --nginx -d api.dealerlogic.io
sudo certbot --nginx -d hooks.dealerlogic.io
sudo certbot --nginx -d dashboard.dealerlogic.io

# Auto-renewal
sudo certbot renew --dry-run
```

## Verification Steps

1. **DNS Propagation Check**
   ```bash
   nslookup dealerlogic.io
   nslookup api.dealerlogic.io
   nslookup hooks.dealerlogic.io
   ```

2. **SSL Certificate Check**
   ```bash
   curl -I https://dealerlogic.io
   curl -I https://api.dealerlogic.io
   ```

3. **API Endpoint Test**
   ```bash
   curl https://api.dealerlogic.io/health
   ```

## Monitoring

- Set up uptime monitoring for all subdomains
- Configure SSL certificate expiry alerts
- Monitor DNS resolution times
- Set up rate limiting alerts