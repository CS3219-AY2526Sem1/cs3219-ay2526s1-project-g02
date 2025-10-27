# Configuration Files

This directory contains configuration files for the NoClue deployment system.

## Directory Structure

```
config/
├── README.md                    # This file
├── cluster.yaml                 # Base cluster configuration
├── secrets.example.yaml         # Secret template (DO NOT commit actual secrets)
└── environments/
    └── prod.yaml               # Production environment overrides
```

## Configuration Files

### cluster.yaml

Base configuration file containing default settings for:
- GCP project configuration
- GKE cluster settings
- Node pool configuration
- Kubernetes namespaces
- Container registry settings
- Application services
- Health checks
- Resource limits
- Observability settings

This file contains the defaults that apply across all environments.

### environments/prod.yaml

Production-specific configuration overrides. Contains:
- Production-scale resource allocations
- Multiple replicas for high availability
- Enhanced security settings
- Monitoring and alerting configuration
- Backup policies
- Disaster recovery settings

**Create additional environment files as needed:**
- `environments/dev.yaml` - Development environment
- `environments/staging.yaml` - Staging environment
- `environments/test.yaml` - Testing environment

### secrets.example.yaml

Template file showing the structure of secrets. **Never commit actual secrets!**

To use:
1. Copy to `secrets.yaml`: `cp secrets.example.yaml secrets.yaml`
2. Fill in actual secret values
3. Ensure `secrets.yaml` is in `.gitignore`

## Usage

### Reading Configuration in Scripts

Use the `parse_yaml()` function from `scripts/utils.sh`:

```bash
# Source the utilities
source "$(dirname "$0")/utils.sh"

# Parse configuration values
PROJECT_ID=$(parse_yaml "config/cluster.yaml" "project_id")
CLUSTER_NAME=$(parse_yaml "config/cluster.yaml" "cluster.name")
REGION=$(parse_yaml "config/cluster.yaml" "cluster.region")

# Parse environment-specific values
REPLICAS=$(parse_yaml "config/environments/prod.yaml" "services.frontend.replicas")
```

### Validating Configuration

```bash
# Validate YAML syntax
source scripts/utils.sh
validate_yaml_file "config/cluster.yaml"
validate_yaml_file "config/environments/prod.yaml"
```

### Merging Configurations

Environment-specific files override base configuration. Apply in order:
1. Read base configuration from `cluster.yaml`
2. Apply environment overrides from `environments/{env}.yaml`
3. Apply secrets from `secrets.yaml` or Google Secret Manager

## Best Practices

### Configuration Management

1. **Version Control**
   - Commit `cluster.yaml` and `environments/*.yaml`
   - Never commit `secrets.yaml` or files matching `*secret*.yaml`
   - Keep sensitive data in Google Secret Manager for production

2. **Environment Separation**
   - Use separate configuration files for each environment
   - Use different GCP projects for production isolation
   - Test configuration changes in development first

3. **Documentation**
   - Comment configuration values explaining their purpose
   - Document any non-obvious settings
   - Keep this README up to date

### Secret Management

1. **Development**
   - Use `secrets.yaml` locally
   - Set file permissions: `chmod 600 secrets.yaml`
   - Never share secrets via chat or email

2. **CI/CD (GitHub Actions)**
   - Store secrets in GitHub repository settings
   - Use GitHub Secrets for sensitive values
   - Rotate secrets regularly

3. **Production**
   - Use Google Secret Manager
   - Enable Workload Identity for secure access
   - Implement automatic secret rotation
   - Audit secret access regularly

### Configuration Updates

1. **Making Changes**
   ```bash
   # Edit configuration
   vim config/cluster.yaml

   # Validate YAML syntax
   source scripts/utils.sh
   validate_yaml_file config/cluster.yaml

   # Test in development first
   # Then apply to production
   ```

2. **Testing Changes**
   - Always test configuration changes in a non-production environment
   - Run setup scripts with dry-run or test flags if available
   - Review changes with the team before applying

3. **Deploying Changes**
   ```bash
   # Apply cluster changes
   ./scripts/setup-gke.sh

   # Deploy/update services
   ./scripts/deploy-services.sh

   # Or update Kubernetes resources directly
   kubectl apply -f k8s/
   ```

## Configuration Schema

### Required Fields

**cluster.yaml:**
- `project_id` - GCP project ID
- `cluster.name` - GKE cluster name
- `cluster.region` - GCP region
- `cluster.zone` - GCP zone
- `nodePool.serviceAccount` - Service account for cluster nodes

**secrets.yaml:**
- `supabase.url` - Supabase project URL
- `supabase.anon_key` - Supabase anonymous key
- `supabase.service_role_key` - Supabase service role key
- `gcp.project_id` - GCP project ID

### Optional Fields

All other fields are optional and have sensible defaults.

## Troubleshooting

### YAML Parsing Errors

If you encounter YAML parsing errors:

1. **Check Syntax**
   ```bash
   # Install yq for validation
   brew install yq  # macOS

   # Validate file
   yq eval '.' config/cluster.yaml
   ```

2. **Common Issues**
   - Incorrect indentation (use 2 spaces, not tabs)
   - Missing quotes around special characters
   - Invalid YAML syntax

### Configuration Not Applied

If configuration changes aren't being applied:

1. **Verify File Location**
   ```bash
   ls -l config/cluster.yaml
   ```

2. **Check File Permissions**
   ```bash
   chmod 644 config/cluster.yaml
   ```

3. **Validate YAML**
   ```bash
   source scripts/utils.sh
   validate_yaml_file config/cluster.yaml
   ```

### Secret Access Issues

If secrets aren't accessible:

1. **Check File Exists**
   ```bash
   ls -l config/secrets.yaml
   ```

2. **Verify Permissions**
   ```bash
   chmod 600 config/secrets.yaml
   ```

3. **Validate Secret Format**
   ```bash
   source scripts/utils.sh
   validate_yaml_file config/secrets.yaml
   ```

## Examples

### Example: Reading Multiple Values

```bash
#!/bin/bash
source "$(dirname "$0")/../scripts/utils.sh"

# Read cluster configuration
PROJECT_ID=$(parse_yaml "config/cluster.yaml" "project_id")
CLUSTER_NAME=$(parse_yaml "config/cluster.yaml" "cluster.name")
REGION=$(parse_yaml "config/cluster.yaml" "cluster.region")

echo "Deploying to cluster: $CLUSTER_NAME"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
```

### Example: Environment-Specific Deployment

```bash
#!/bin/bash
source "$(dirname "$0")/../scripts/utils.sh"

ENVIRONMENT=${1:-dev}
ENV_CONFIG="config/environments/${ENVIRONMENT}.yaml"

# Check if environment config exists
if [[ ! -f "$ENV_CONFIG" ]]; then
    log_error "Environment configuration not found: $ENV_CONFIG"
    exit 1
fi

# Read environment-specific settings
REPLICAS=$(parse_yaml "$ENV_CONFIG" "services.frontend.replicas")
MACHINE_TYPE=$(parse_yaml "$ENV_CONFIG" "cluster.machine_type")

echo "Deploying $ENVIRONMENT environment"
echo "Replicas: $REPLICAS"
echo "Machine Type: $MACHINE_TYPE"
```

## Additional Resources

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [Kubernetes Configuration Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [YAML Specification](https://yaml.org/spec/1.2/spec.html)
- [yq Documentation](https://github.com/mikefarah/yq)

## Support

For questions or issues with configuration:
1. Check this README
2. Review example files
3. Consult the main project documentation
4. Ask the team in the project chat

---

**Remember:** Never commit secrets to version control! Always use `.gitignore` and secret management tools.
