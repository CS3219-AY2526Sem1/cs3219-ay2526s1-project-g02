# Kubernetes namespace for the application
resource "kubernetes_namespace" "app" {
  metadata {
    name = "noclue-app"
    labels = {
      name        = "noclue-app"
      environment = var.environment
      managed_by  = "terraform"
    }
  }

  depends_on = [google_container_node_pool.primary_nodes]
}

# Kubernetes secret for Supabase credentials
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    supabase-url = var.supabase_url
    supabase-key = var.supabase_key
  }

  type = "Opaque"
}

# ConfigMap for application configuration
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    ENVIRONMENT       = var.environment
    FRONTEND_REPLICAS = tostring(var.frontend_replicas)
    BACKEND_REPLICAS  = tostring(var.backend_replicas)
  }
}
