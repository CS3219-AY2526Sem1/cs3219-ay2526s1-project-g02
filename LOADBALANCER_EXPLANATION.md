# Why So Many LoadBalancers? And The IP Problem

## 🤔 Your Questions Answered

### Q1: Why do I have 6 LoadBalancers?

**Short Answer:** Your frontend (running in users' browsers) needs to make GraphQL requests to backend services. To do this, backend services must be publicly accessible.

### Q2: Are the IPs hardcoded? Won't they change?

**Short Answer:** IPs were initially hardcoded (bad!), but now they're **dynamically fetched** and stored in a ConfigMap that updates automatically during deployment.

---

## 📊 Current Architecture (Working, But Expensive)

```
User's Browser
    ↓
Frontend LoadBalancer (34.135.186.244)
    ↓
Frontend App (Next.js)
    ↓
Makes GraphQL Requests To:
    ├─ User Service LoadBalancer (34.67.192.126:4001)
    ├─ Question Service LoadBalancer (34.16.114.117:4002)
    ├─ Matching Service LoadBalancer (34.123.68.82:4003)
    ├─ Collaboration Service LoadBalancer (104.198.77.205:4004)
    └─ LLM Service LoadBalancer (34.121.74.235:4005)

Total: 6 LoadBalancers × $18/month = $108/month
```

### Why This Architecture?

**The Problem:**
- Frontend uses Apollo Client (GraphQL) **in the browser** (client-side)
- Browser can't access internal Kubernetes services (ClusterIP)
- Backend services need to be publicly accessible

**The Quick Fix:**
- Expose each backend service via LoadBalancer
- Gives each service a public IP
- Browser can now reach them

### Why IPs Needed To Be Dynamic:

LoadBalancer IPs can change if:
- ❌ Service is deleted and recreated
- ❌ Cluster is redeployed
- ❌ GCP reassigns the IP

**Solution Implemented:**
```bash
# This script runs automatically during deployment:
./scripts/update-frontend-urls.sh

# It:
1. Fetches current LoadBalancer IPs
2. Creates ConfigMap with URLs
3. Frontend reads from ConfigMap (not hardcoded!)
4. If IPs change, just re-run the script
```

---

## 💰 Cost Breakdown

| Resource | Quantity | Cost/Month | Total |
|----------|----------|------------|-------|
| GKE Cluster | 1 | $0-73 | ~$73 |
| e2-small nodes | 2 | $25 each | ~$50 |
| **LoadBalancers** | **6** | **$18 each** | **~$108** |
| Pub/Sub | Usage | Free tier | ~$0-5 |
| **TOTAL** | | | **~$231-236/month** |

**The LoadBalancers are your biggest cost!**

---

## ✅ Better Solution: Use Ingress (Recommended)

### Architecture with Ingress:

```
User's Browser
    ↓
ONE Ingress LoadBalancer (1 IP address)
    ↓
Path-based routing:
    ├─ /api/user/*          → user-service (ClusterIP)
    ├─ /api/question/*      → question-service (ClusterIP)
    ├─ /api/matching/*      → matching-service (ClusterIP)
    ├─ /api/collaboration/* → collaboration-service (ClusterIP)
    ├─ /api/llm/*           → llm-service (ClusterIP)
    └─ /*                   → frontend (ClusterIP)

Total: 1 LoadBalancer × $18/month = $18/month
Savings: $90/month! 💰
```

### Benefits of Ingress:

✅ **Cost savings** - 1 LoadBalancer instead of 6 ($90/month saved)
✅ **SSL/HTTPS** - Easy to add managed certificates
✅ **Custom domain** - Can use api.noclue.com
✅ **Better security** - Services not directly exposed
✅ **Rate limiting** - Can add at Ingress level
✅ **Logging** - Centralized access logs

---

## 🚀 How to Migrate to Ingress (When Ready)

I've already created the Ingress configuration: `k8s/ingress.yaml`

### Step 1: Install Ingress Controller

```bash
# Use GKE's built-in Ingress (free)
# Already available on your cluster!
```

### Step 2: Deploy Ingress

```bash
# Apply the Ingress
kubectl apply -f k8s/ingress.yaml

# Wait for IP assignment (2-3 min)
kubectl get ingress -n noclue-app -w
```

### Step 3: Update Frontend URLs

Change frontend to use single API endpoint:
```javascript
// Instead of multiple IPs:
NEXT_PUBLIC_USER_GRAPHQL_URL=http://34.67.192.126:4001/graphql

// Use single Ingress IP with paths:
NEXT_PUBLIC_API_BASE_URL=http://INGRESS_IP
NEXT_PUBLIC_USER_GRAPHQL_URL=${API_BASE_URL}/api/user/graphql
NEXT_PUBLIC_QUESTION_GRAPHQL_URL=${API_BASE_URL}/api/question/graphql
// etc.
```

### Step 4: Change Services Back to ClusterIP

```bash
# Revert all backend services to ClusterIP
# (saves 5 LoadBalancers = $90/month!)
```

---

## 🎯 Current Solution (Temporary)

For now, you're using **multiple LoadBalancers** with **dynamic IP configuration**:

✅ **Works immediately** - No setup needed
✅ **IPs auto-update** - Via ConfigMap and update script
✅ **Simple** - Each service has direct access

❌ **Expensive** - $108/month for LoadBalancers
❌ **No HTTPS** - Not secure for production
❌ **6 public endpoints** - Larger attack surface

---

## 📋 What Happens on Each Deployment

The CI/CD pipeline now:

1. Deploys all services
2. **Automatically runs** `update-frontend-urls.sh`
3. Script fetches current LoadBalancer IPs
4. Updates ConfigMap with latest URLs
5. Restarts frontend to pick up changes
6. ✅ **No hardcoded IPs!**

---

## 🔮 Recommended Next Steps

### Immediate (Keep It Working):
- ✅ Current setup works fine
- ✅ IPs update automatically
- ✅ Keep monitoring costs

### Within 1 Month (Save Money):
- 🎯 Migrate to Ingress
- 🎯 Add SSL certificates
- 🎯 Configure custom domain
- 💰 **Save $90/month**

### Long Term (Best Practice):
- 🎯 Use Ingress with Cloud CDN
- 🎯 Add Cloud Armor (DDoS protection)
- 🎯 Implement rate limiting
- 🎯 Add monitoring and alerting

---

## 💡 TL;DR

**Why so many LoadBalancers?**
- Browser needs to access backend services
- Each service exposed via LoadBalancer
- Quick fix, but expensive ($108/month)

**Are IPs hardcoded?**
- No! They're stored in ConfigMap
- Auto-updated during each deployment
- Won't break if IPs change

**Better solution:**
- Use Ingress (1 LoadBalancer)
- **Saves $90/month**
- Config file ready: `k8s/ingress.yaml`
- Can migrate when ready

---

## 🛠️ To Update URLs Manually

If LoadBalancer IPs change, just run:

```bash
./scripts/update-frontend-urls.sh
```

This will:
1. Fetch new IPs
2. Update ConfigMap
3. Restart frontend
4. ✅ Everything works again!

