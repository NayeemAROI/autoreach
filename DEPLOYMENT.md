# AutoReach — Production Deployment Guide
### Hosting on a VPS with Namecheap Domain

---

## Prerequisites
- ✅ A **Namecheap domain** (e.g., `autoreach.io`)
- ✅ A **VPS** — DigitalOcean ($6/mo), Vultr ($5/mo), or AWS Lightsail ($5/mo)
  - **OS:** Ubuntu 22.04 LTS
  - **Min specs:** 1 CPU / 1 GB RAM / 25 GB SSD

---

## Step 1: Create Your VPS

### DigitalOcean (recommended)
1. Go to [digitalocean.com](https://digitalocean.com) → **Create Droplet**
2. Choose **Ubuntu 22.04** → **$6/mo plan** (1 CPU, 1 GB RAM)
3. Choose a datacenter region closest to your users
4. Add your **SSH key** (or use password auth)
5. Click **Create Droplet** → note the **IP address**

---

## Step 2: Point Namecheap Domain to VPS

1. Log into **Namecheap** → **Domain List** → click **Manage** on your domain
2. Go to **Advanced DNS** tab
3. Delete any existing A records, then add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `YOUR_VPS_IP` | Automatic |
| A Record | `www` | `YOUR_VPS_IP` | Automatic |

4. Wait 5-30 minutes for DNS to propagate

---

## Step 3: Initial Server Setup

SSH into your VPS:
```bash
ssh root@YOUR_VPS_IP
```

Run these commands one by one:

### 3a. Update system & install essentials
```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx
```

### 3b. Install Node.js (v20 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # verify: should show v20.x
```

### 3c. Install PM2 (process manager)
```bash
npm install -g pm2
```

### 3d. Create app directory & log folder
```bash
mkdir -p /var/www/autoreach
mkdir -p /var/log/autoreach
```

---

## Step 4: Deploy the App

### 4a. Clone the repository
```bash
cd /var/www/autoreach
git clone https://github.com/NayeemAROI/autoreach.git .
```

### 4b. Create the production `.env` file
```bash
cp .env.production server/.env
nano server/.env
```

**IMPORTANT:** Change `JWT_SECRET` to a long random string:
```bash
# Generate a secure secret:
openssl rand -hex 64
# Copy the output and paste it as JWT_SECRET value
```

### 4c. Install dependencies & build
```bash
# Server
cd /var/www/autoreach/server
npm install --production

# Client
cd /var/www/autoreach/client
npm install
npm run build
```

### 4d. Initialize the database
```bash
cd /var/www/autoreach
node -e "require('./server/db/database'); console.log('DB ready')"
```

### 4e. Start with PM2
```bash
cd /var/www/autoreach
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # auto-start on server reboot
```

**Verify it's running:**
```bash
pm2 status
curl http://localhost:3001/api/health
# Should return: {"status":"ok",...}
```

---

## Step 5: Configure Nginx + SSL

### 5a. Copy Nginx config
```bash
cp /var/www/autoreach/nginx.conf /etc/nginx/sites-available/autoreach
```

### 5b. Replace YOUR_DOMAIN with your actual domain
```bash
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' /etc/nginx/sites-available/autoreach
```
*(Replace `yourdomain.com` with your actual Namecheap domain)*

### 5c. Enable the site
```bash
ln -s /etc/nginx/sites-available/autoreach /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t        # test config — should say "ok"
systemctl reload nginx
```

### 5d. Get free SSL certificate (Let's Encrypt)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
- Enter your email when prompted
- Agree to terms
- Choose **redirect HTTP to HTTPS** when asked

Certbot auto-renews. Verify:
```bash
certbot renew --dry-run
```

---

## Step 6: Verify Everything

1. Open `https://yourdomain.com` in your browser
2. You should see the AutoReach **login page** 🎉
3. Register an account and verify all features work

---

## Ongoing Deployments

After pushing code updates to GitHub, SSH into your server and run:

```bash
cd /var/www/autoreach
bash deploy.sh
```

This will pull the latest code, rebuild the frontend, and restart the server.

---

## Useful PM2 Commands

| Command | What it does |
|---|---|
| `pm2 status` | Show running processes |
| `pm2 logs autoreach` | View live logs |
| `pm2 logs autoreach --lines 100` | View last 100 log lines |
| `pm2 restart autoreach` | Restart the app |
| `pm2 monit` | Real-time dashboard |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site won't load | `pm2 status` — is the app running? |
| "502 Bad Gateway" | Node app crashed → `pm2 logs autoreach` to check errors |
| SSL certificate error | Run `certbot --nginx -d yourdomain.com` again |
| DB locked error | Ensure only 1 PM2 instance runs (`instances: 1`) |
| Can't SSH | Check VPS firewall allows port 22 |
| WebSocket not connecting | Ensure Nginx `/ws` location block is present |
