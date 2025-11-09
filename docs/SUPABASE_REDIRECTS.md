# Supabase Redirect URL Configuration

This guide explains how to properly configure Supabase redirect URLs for email confirmations, password resets, and OAuth logins.

## Table of Contents
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Setup Steps](#setup-steps)
- [Configuration Details](#configuration-details)
- [Troubleshooting](#troubleshooting)

## The Problem

By default, Supabase email confirmation links redirect to `http://localhost:3000`, which doesn't work in production. This causes errors like:

```
http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

This happens for:
- ✉️ Email confirmation after registration
- 🔑 Password reset links
- 🔐 OAuth (Google/GitHub) login redirects

## The Solution

We've implemented a comprehensive fix that:

1. **Frontend**: Automatically detects and uses the correct site URL
2. **Backend**: Passes redirect URLs to Supabase when sending emails
3. **Deployment**: Automatically configures URLs based on LoadBalancer IP or custom domain

## Setup Steps

### 1. Configure Supabase Dashboard

Go to your Supabase project dashboard:

**Authentication → URL Configuration**

Add these URLs to the **Redirect URLs** list:

#### For Production (with LoadBalancer IP):
```
http://YOUR_LOADBALANCER_IP/auth/callback
http://YOUR_LOADBALANCER_IP/update-password
```

#### For Production (with custom domain):
```
https://yourdomain.com/auth/callback
https://yourdomain.com/update-password
https://www.yourdomain.com/auth/callback
https://www.yourdomain.com/update-password
```

#### For Local Development:
```
http://localhost:3000/auth/callback
http://localhost:3000/update-password
```

**Site URL**: Set to your production URL:
- With IP: `http://YOUR_LOADBALANCER_IP`
- With domain: `https://yourdomain.com`

### 2. Set GitHub Secrets (Optional but Recommended)

If you have a custom domain, add this GitHub secret:

```bash
# In GitHub: Settings → Secrets and variables → Actions → New repository secret

Name: SITE_URL
Value: https://yourdomain.com  (or http://YOUR_IP for IP-based access)
```

This ensures consistent URLs across your application.

### 3. Get Your LoadBalancer IP

After deployment, get your frontend LoadBalancer IP:

```bash
kubectl get service frontend-service -n noclue-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Example output: `34.135.186.244`

### 4. Update Supabase Dashboard

Update the Supabase dashboard with your actual IP:

1. Go to **Authentication → URL Configuration**
2. Replace placeholder URLs with your LoadBalancer IP
3. Save changes

### 5. Verify Configuration

Test each flow:

#### Email Confirmation:
1. Register a new account
2. Check email
3. Click confirmation link
4. Should redirect to `http://YOUR_IP/auth/callback` (not localhost)

#### Password Reset:
1. Go to "Forgot Password"
2. Enter email
3. Click link in email
4. Should redirect to `http://YOUR_IP/update-password`

#### OAuth Login:
1. Click "Login with Google" or "Login with GitHub"
2. Authorize
3. Should redirect back to `http://YOUR_IP/auth/callback`

## Configuration Details

### Frontend Configuration

The frontend automatically detects the site URL:

**File**: `frontend/src/lib/supabaseClient.ts`

```typescript
// Automatically uses:
// 1. NEXT_PUBLIC_SITE_URL env variable (from Docker build)
// 2. window.location.origin (browser URL)
// 3. Fallback to localhost in development

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    redirectTo: `${siteUrl}/auth/callback`,
  },
});
```

### Backend Configuration

The backend gets the frontend URL from a Kubernetes ConfigMap:

**File**: `backend/services/user-service/src/users/users.service.ts`

```typescript
// Registration with email redirect
async register(email: string, username: string, password: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  await this.supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${frontendUrl}/auth/callback`,
    },
  });
}

// Password reset with redirect
async resetPasswordLink(email: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  await this.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${frontendUrl}/update-password`,
  });
}
```

### Deployment Configuration

The deployment automatically:

1. Creates a ConfigMap with the frontend URL
2. Gets the LoadBalancer IP
3. Updates the ConfigMap with the actual IP
4. Restarts services to pick up the new value

**Kubernetes ConfigMap**: `k8s/frontend-url-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-url-config
  namespace: noclue-app
data:
  FRONTEND_URL: "http://YOUR_LOADBALANCER_IP"
```

## Troubleshooting

### Problem: Still redirecting to localhost

**Solution**: Update the ConfigMap manually:

```bash
# Get your frontend IP
FRONTEND_IP=$(kubectl get service frontend-service -n noclue-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Update ConfigMap
kubectl create configmap frontend-url-config \
  --from-literal=FRONTEND_URL="http://$FRONTEND_IP" \
  -n noclue-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart user service to pick up the change
kubectl rollout restart deployment/user-service -n noclue-app

# Restart frontend to pick up the change
kubectl rollout restart deployment/frontend -n noclue-app
```

### Problem: Email link says "Invalid or expired"

**Causes**:
1. Link clicked more than once (single use only)
2. Link older than 1 hour (expired)
3. Redirect URL not whitelisted in Supabase dashboard

**Solution**:
1. Request a new email confirmation/password reset
2. Add your URL to Supabase dashboard whitelist
3. Make sure Site URL is set correctly in Supabase

### Problem: OAuth redirects to wrong URL

**Solution**: Check the OAuth redirect in your code:

```typescript
// Should use dynamic URL, not hardcoded
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${siteUrl}/auth/callback`,
  },
});
```

### Problem: Using HTTPS with self-signed certificate

If you're using HTTPS with a self-signed certificate (via the SSL setup script):

1. Browser will show security warning (expected)
2. Click "Advanced" → "Proceed"
3. Update Supabase URLs to use `https://` instead of `http://`

**Better solution**: Use a custom domain with Google-managed certificate:

```bash
# Setup SSL with domain
./scripts/setup-ssl.sh --domain yourdomain.com

# Update GitHub secret
SITE_URL=https://yourdomain.com

# Update Supabase dashboard with HTTPS URLs
```

## Environment Variables Reference

### Frontend Build Args (Dockerfile)
```dockerfile
ARG NEXT_PUBLIC_SITE_URL
# Used by Supabase client for redirect URLs
# Set during Docker build in CI/CD
```

### Backend Environment Variables (Kubernetes)
```yaml
env:
  - name: FRONTEND_URL
    valueFrom:
      configMapKeyRef:
        name: frontend-url-config
        key: FRONTEND_URL
```

### GitHub Secrets (Optional)
```
SITE_URL - Your production URL (http://IP or https://domain.com)
```

## Quick Fix Commands

### Get your current configuration:
```bash
# Get frontend IP
kubectl get service frontend-service -n noclue-app

# Get current ConfigMap
kubectl get configmap frontend-url-config -n noclue-app -o yaml

# Check environment variables
kubectl exec -it deployment/user-service -n noclue-app -- env | grep FRONTEND_URL
kubectl exec -it deployment/frontend -n noclue-app -- env | grep NEXT_PUBLIC
```

### Update configuration:
```bash
# Set your IP
export FRONTEND_IP="34.135.186.244"

# Update ConfigMap
kubectl create configmap frontend-url-config \
  --from-literal=FRONTEND_URL="http://$FRONTEND_IP" \
  -n noclue-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart services
kubectl rollout restart deployment/user-service -n noclue-app
kubectl rollout restart deployment/frontend -n noclue-app

# Wait for rollout
kubectl rollout status deployment/user-service -n noclue-app
kubectl rollout status deployment/frontend -n noclue-app
```

## Summary

✅ **What's Fixed:**
- Email confirmation links now use production URL
- Password reset links redirect correctly
- OAuth logins work in production
- Automatic IP detection and configuration
- Support for both IP and domain-based deployments

🔧 **What You Need to Do:**
1. Get your LoadBalancer IP after deployment
2. Add redirect URLs to Supabase dashboard
3. Optionally: Set up custom domain with HTTPS

📝 **Resources:**
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Setting up HTTPS](./HTTPS_SETUP.md) (if you created this file)
- [Deployment Guide](./SETUP.md)

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section above or file an issue.

