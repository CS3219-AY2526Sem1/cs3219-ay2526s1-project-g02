# Terraform Infrastructure for NoClue

This directory contains Terraform configuration to provision and manage the Google Cloud Platform (GCP) infrastructure for the NoClue application.

## What Terraform Manages

This Terraform configuration provisions:

- **VPC Network** with custom subnets and IP ranges
- **GKE Cluster** with autoscaling node pools
- **Service Accounts** with appropriate IAM permissions
- **Firewall Rules** for network security
- **Cloud NAT** for outbound internet access
- **Kubernetes Resources** (namespaces, secrets, configmaps)

## Prerequisites

1. **Install Terraform**
   ```bash
   # macOS
   brew tap hashicorp/tap
   brew install hashicorp/tap/terraform

   # Or download from https://www.terraform.io/downloads
   ```

2. **Install Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Initialize and authenticate
   gcloud init
   gcloud auth application-default login
   ```

3. **GCP Project Setup**
   - Create a GCP project (or use existing)
   - Enable billing for the project
   - Note your project ID

## Quick Start

### 1. Configure Variables

Copy the example variables file and customize it:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
zone       = "us-central1-a"

cluster_name = "noclue-cluster"
environment  = "dev"

supabase_url = "https://your-project.supabase.co"
supabase_key = "your-supabase-anon-key"
```

### 2. Initialize Terraform

```bash
terraform init
```

This downloads required providers and sets up the backend.

### 3. Plan Infrastructure Changes

```bash
terraform plan
```

Review the planned changes to ensure they match your expectations.

### 4. Apply Infrastructure

```bash
terraform apply
```

Type `yes` when prompted to confirm. This will:
- Create VPC network and subnets
- Provision GKE cluster (takes ~10-15 minutes)
- Configure IAM and service accounts
- Create Kubernetes secrets

### 5. Configure kubectl

After successful apply, configure kubectl to connect to your cluster:

```bash
# The command is shown in Terraform outputs
gcloud container clusters get-credentials noclue-cluster --zone us-central1-a --project your-project-id

# Verify connection
kubectl get nodes
kubectl get namespaces
```

## Terraform Commands

### Check Current State

```bash
terraform show
```

### View Outputs

```bash
terraform output
```

### Format Terraform Files

```bash
terraform fmt -recursive
```

### Validate Configuration

```bash
terraform validate
```

### Destroy Infrastructure

**WARNING:** This will delete all resources created by Terraform!

```bash
terraform destroy
```

## Remote State Management (Recommended)

For team collaboration, store Terraform state remotely in Google Cloud Storage:

### 1. Create a GCS bucket for state

```bash
gsutil mb -p YOUR_PROJECT_ID gs://YOUR_PROJECT_ID-terraform-state
gsutil versioning set on gs://YOUR_PROJECT_ID-terraform-state
```

### 2. Enable backend in main.tf

Uncomment and configure the backend block in `main.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket = "your-project-id-terraform-state"
    prefix = "terraform/state"
  }
}
```

### 3. Migrate state

```bash
terraform init -migrate-state
```

## File Structure

```
terraform/
├── main.tf              # Provider configuration and required APIs
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── gke.tf              # GKE cluster and node pool configuration
├── network.tf          # VPC, subnets, and firewall rules
├── iam.tf              # Service accounts and IAM permissions
├── kubernetes.tf       # Kubernetes resources (secrets, configmaps)
├── terraform.tfvars.example  # Example variables file
├── .gitignore          # Git ignore patterns
└── README.md           # This file
```

## Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `project_id` | GCP Project ID | - | Yes |
| `region` | GCP region | `us-central1` | No |
| `zone` | GCP zone | `us-central1-a` | No |
| `cluster_name` | GKE cluster name | `noclue-cluster` | No |
| `environment` | Environment name | `dev` | No |
| `gke_num_nodes` | Initial node count | `2` | No |
| `gke_machine_type` | Machine type for nodes | `e2-medium` | No |
| `gke_min_nodes` | Min nodes (autoscaling) | `1` | No |
| `gke_max_nodes` | Max nodes (autoscaling) | `5` | No |
| `supabase_url` | Supabase URL | - | Yes |
| `supabase_key` | Supabase API key | - | Yes |

## Outputs Reference

After applying, Terraform provides these outputs:

| Output | Description |
|--------|-------------|
| `project_id` | GCP Project ID |
| `cluster_name` | GKE cluster name |
| `cluster_endpoint` | GKE cluster API endpoint |
| `network_name` | VPC network name |
| `service_account_email` | GKE node service account |
| `get_credentials_command` | kubectl configuration command |

## Cost Estimation

Approximate monthly costs for default configuration:

- **GKE Cluster Management**: $0 (free tier) or ~$70/month
- **e2-medium nodes (2 nodes)**: ~$30-50/month
- **Load Balancers**: ~$18/month per LB
- **Network Egress**: Variable based on traffic
- **Persistent Storage**: Variable

**Estimated total**: $100-200/month

Use [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) for detailed estimates.

## Troubleshooting

### Error: API not enabled

```
Error: Error creating service: googleapi: Error 403: API [...] is not enabled for project
```

**Solution**: Enable the required API:
```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

### Error: Insufficient permissions

**Solution**: Ensure you have the following roles:
- `roles/compute.admin`
- `roles/container.admin`
- `roles/iam.serviceAccountAdmin`

### Cluster creation timeout

**Solution**: GKE cluster creation takes 10-15 minutes. If it times out, increase the timeout in `gke.tf` or re-run `terraform apply`.

### State lock errors

If using remote state and you encounter lock errors:

```bash
# Force unlock (use carefully!)
terraform force-unlock LOCK_ID
```

## Security Best Practices

1. **Never commit `terraform.tfvars`** - It contains sensitive data
2. **Use Workload Identity** instead of service account keys
3. **Enable Binary Authorization** for production (commented in `gke.tf`)
4. **Restrict network access** - Update firewall rules as needed
5. **Use remote state** with encryption enabled
6. **Rotate secrets regularly** - Update Kubernetes secrets periodically

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/deploy.yml`) can be updated to use Terraform. See the main project README for details.

## Additional Resources

- [Terraform GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GKE Terraform Examples](https://github.com/terraform-google-modules/terraform-google-kubernetes-engine)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Terraform logs: `TF_LOG=DEBUG terraform apply`
3. Consult GCP documentation
4. Open an issue in the project repository
