#!/bin/bash

# Configuration
RESOURCE_GROUP="externai-rg"
ACR_NAME="externairegistry"
APP_NAME="externai-backend"
IMAGE_TAG="v$(date +%Y%m%d%H%M)"

echo "🚀 Starting Azure Deployment..."

# 1. Login to ACR
echo "🔑 Logging into Azure Container Registry..."
az acr login --name $ACR_NAME

# 2. Build the Docker image
echo "📦 Building Docker image..."
docker build -t $ACR_NAME.azurecr.io/externai-backend:$IMAGE_TAG .

# 3. Push to ACR
echo "⬆️ Pushing image to ACR..."
docker push $ACR_NAME.azurecr.io/externai-backend:$IMAGE_TAG

# 4. Update Web App
echo "🔄 Updating Azure Web App to use new image..."
az webapp config container set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/externai-backend:$IMAGE_TAG

echo "✅ Deployment complete! Your app is being updated."
echo "📍 Access your app at: https://$APP_NAME.azurewebsites.net"
