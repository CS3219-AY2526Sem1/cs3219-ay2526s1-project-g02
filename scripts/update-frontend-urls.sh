#!/bin/bash

# Update Frontend with Backend LoadBalancer URLs
# This script fetches the current LoadBalancer IPs and updates the frontend deployment

set -e

NAMESPACE="${NAMESPACE:-noclue-app}"

echo "🔍 Fetching backend LoadBalancer IPs..."

# Function to get external IP for a service
get_service_ip() {
    local service_name=$1
    local ip=$(kubectl get service $service_name -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [ -z "$ip" ]; then
        echo "⚠️  Warning: $service_name LoadBalancer IP not ready yet" >&2
        echo "pending"
    else
        echo "$ip"
    fi
}

# Get all service IPs
USER_SERVICE_IP=$(get_service_ip "user-service")
QUESTION_SERVICE_IP=$(get_service_ip "question-service")
MATCHING_SERVICE_IP=$(get_service_ip "matching-service")
COLLABORATION_SERVICE_IP=$(get_service_ip "collaboration-service")
LLM_SERVICE_IP=$(get_service_ip "llm-service")

echo ""
echo "📋 Backend Service IPs:"
echo "  User Service:          $USER_SERVICE_IP"
echo "  Question Service:      $QUESTION_SERVICE_IP"
echo "  Matching Service:      $MATCHING_SERVICE_IP"
echo "  Collaboration Service: $COLLABORATION_SERVICE_IP"
echo "  LLM Service:           $LLM_SERVICE_IP"
echo ""

# Check if all IPs are ready
if [[ "$USER_SERVICE_IP" == "pending" ]] || \
   [[ "$QUESTION_SERVICE_IP" == "pending" ]] || \
   [[ "$MATCHING_SERVICE_IP" == "pending" ]] || \
   [[ "$COLLABORATION_SERVICE_IP" == "pending" ]] || \
   [[ "$LLM_SERVICE_IP" == "pending" ]]; then
    echo "⚠️  Some LoadBalancer IPs are not ready yet. Waiting 60 seconds..."
    sleep 60
    
    # Retry
    USER_SERVICE_IP=$(get_service_ip "user-service")
    QUESTION_SERVICE_IP=$(get_service_ip "question-service")
    MATCHING_SERVICE_IP=$(get_service_ip "matching-service")
    COLLABORATION_SERVICE_IP=$(get_service_ip "collaboration-service")
    LLM_SERVICE_IP=$(get_service_ip "llm-service")
fi

# Create or update ConfigMap with service URLs
echo "🔧 Creating ConfigMap with backend URLs..."
kubectl create configmap backend-urls \
  --from-literal=USER_SERVICE_URL="http://${USER_SERVICE_IP}:4001/graphql" \
  --from-literal=QUESTION_SERVICE_URL="http://${QUESTION_SERVICE_IP}:4002/graphql" \
  --from-literal=MATCHING_SERVICE_URL="http://${MATCHING_SERVICE_IP}:4003/graphql" \
  --from-literal=COLLABORATION_SERVICE_URL="http://${COLLABORATION_SERVICE_IP}:4004/graphql" \
  --from-literal=LLM_SERVICE_URL="http://${LLM_SERVICE_IP}:4005" \
  --from-literal=MATCHING_WS_URL="http://${MATCHING_SERVICE_IP}:4003" \
  --from-literal=COLLABORATION_WS_URL="ws://${COLLABORATION_SERVICE_IP}:1234" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ ConfigMap 'backend-urls' created/updated"
echo ""
echo "🔄 Restarting frontend to pick up new URLs..."
kubectl rollout restart deployment/frontend -n $NAMESPACE

echo ""
echo "✅ Done! Frontend will use these backend URLs:"
echo "   User:          http://${USER_SERVICE_IP}:4001/graphql"
echo "   Question:      http://${QUESTION_SERVICE_IP}:4002/graphql"
echo "   Matching:      http://${MATCHING_SERVICE_IP}:4003/graphql"
echo "   Collaboration: http://${COLLABORATION_SERVICE_IP}:4004/graphql"
echo "   LLM:           http://${LLM_SERVICE_IP}:4005"
echo "   WebSocket:     ws://${COLLABORATION_SERVICE_IP}:1234"

