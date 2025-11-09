# Quick Fix: Supabase Email Redirects

**Problem**: Email confirmation links redirect to `localhost` instead of your production URL.

## Immediate Fix (5 minutes)

### Step 1: Get Your LoadBalancer IP

```bash
kubectl get service frontend-service -n noclue-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Example output**: `34.135.186.244`

### Step 2: Update Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Authentication** → **URL Configuration**
4. Add these URLs to **Redirect URLs**:

```
http://YOUR_IP/auth/callback
http://YOUR_IP/update-password
```

**Replace `YOUR_IP`** with the IP from Step 1.

5. Set **Site URL** to: `http://YOUR_IP`
6. Click **Save**

### Step 3: Update Your Kubernetes Configuration

```bash
# Set your IP (replace with actual IP)
export FRONTEND_IP="34.135.186.244"

# Update the ConfigMap
kubectl create configmap frontend-url-config \
  --from-literal=FRONTEND_URL="http://$FRONTEND_IP" \
  -n noclue-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart services to pick up the new configuration
kubectl rollout restart deployment/user-service -n noclue-app
kubectl rollout restart deployment/frontend -n noclue-app
```

### Step 4: Test

1. Register a new account
2. Check your email
3. Click the confirmation link
4. Should now redirect to `http://YOUR_IP/auth/callback` ✅

## Done! 🎉

Your email confirmations, password resets, and OAuth logins should now work correctly.

---

## Optional: Set Up HTTPS

Want to remove the "not secure" warning? Add HTTPS:

### Option 1: Self-Signed Certificate (Quick, shows browser warning)

```bash
# Run the SSL setup script
./scripts/setup-ssl.sh --self-signed --ip YOUR_IP
```

### Option 2: Custom Domain (Recommended, free SSL)

```bash
# 1. Point your domain to the LoadBalancer IP (DNS A record)
# 2. Run the SSL setup script
./scripts/setup-ssl.sh --domain yourdomain.com

# 3. Update Supabase dashboard URLs to use https://yourdomain.com
# 4. Set GitHub secret: SITE_URL=https://yourdomain.com
# 5. Redeploy
```

---

## Need More Details?

See the full documentation: [docs/SUPABASE_REDIRECTS.md](./SUPABASE_REDIRECTS.md)

