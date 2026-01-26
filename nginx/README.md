# Nginx Configuration for Admin UI

## Overview

This directory contains Nginx configuration for running Admin UI behind a reverse proxy in production. This setup provides:

- SSL/TLS termination
- HTTP to HTTPS redirect
- Gzip compression
- Security headers (stricter than tenant UI)
- Static asset caching
- Rate limiting
- Robot exclusion (admin panel shouldn't be indexed)

## SSL Certificates

For production, you need SSL certificates. Here are your options:

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (automatic)
sudo certbot --nginx -d admin.your-domain.com

# Certificates will be placed in:
# /etc/letsencrypt/live/admin.your-domain.com/fullchain.pem
# /etc/letsencrypt/live/admin.your-domain.com/privkey.pem

# Update nginx.conf to use these paths
```

### Option 2: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# ⚠️ WARNING: Self-signed certificates will show browser warnings
# Only use for local development
```

### Option 3: Commercial Certificate

1. Purchase SSL certificate from provider (DigiCert, Comodo, etc.)
2. Place certificate files in `nginx/ssl/`
3. Update nginx.conf paths

## Configuration

1. **Edit nginx.conf:**
   - Replace `admin.your-domain.com` with your actual domain
   - Update SSL certificate paths
   - Adjust rate limiting if needed
   - Update CSP `connect-src` with your API URL

2. **Test configuration:**
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. **Reload Nginx:**
   ```bash
   docker-compose exec nginx nginx -s reload
   ```

## Directory Structure

```
nginx/
├── nginx.conf       # Main Nginx configuration
├── ssl/            # SSL certificates directory
│   ├── cert.pem    # SSL certificate (you provide)
│   └── key.pem     # SSL private key (you provide)
└── README.md       # This file
```

## Security Notes

- Never commit SSL private keys to Git (.gitignore already configured)
- Rotate certificates before expiry
- Use strong SSL protocols (TLSv1.2, TLSv1.3)
- Enable HSTS (already configured)
- Admin panel robots.txt denies all crawlers by default
- Rate limiting is stricter than tenant UI (burst=10 vs burst=20)
- CSP headers are included for additional security

## Differences from Tenant UI

| Feature | Admin UI | Tenant UI |
|---------|----------|-----------|
| Rate limit burst | 10 | 20 |
| Robots.txt | Disallow all | Allow |
| CSP header | Strict | Not set |
| Domain example | admin.your-domain.com | your-domain.com |
