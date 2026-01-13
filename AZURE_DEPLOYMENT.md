# Azure Deployment Guide for ExternAI Backend

This guide details the steps to deploy the ExternAI backend to Azure using Docker and Azure App Service.

## Prerequisites

- [Azure Account](https://portal.azure.com/)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed locally
- Docker installed locally
- Firebase Project configured (see `FIREBASE_SETUP.md`)

## Step 1: Login to Azure

```bash
az login
```

## Step 2: Create Azure Resources

You can create these via the Azure Portal or CLI.

### 1. Resource Group
```bash
az group create --name externai-rg --location eastus
```

### 2. Azure Container Registry (ACR)
```bash
az acr create --resource-group externai-rg --name externairegistry --sku Basic
```

### 3. App Service Plan (Linux)
```bash
az appservice plan create --name externai-plan --resource-group externai-rg --is-linux --sku B1
```

### 4. Web App for Containers
```bash
az webapp create --resource-group externai-rg --plan externai-plan --name externai-backend --deployment-container-image-name externairegistry.azurecr.io/externai-backend:v1
```

## Step 3: Configure Environment Variables

In the Azure Portal, go to your Web App > **Settings** > **Environment variables** (or **Configuration**) and add the following:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `ALLOWED_ORIGINS` | `*` (or your landing page URL) |
| `FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL` | Your Firebase Service Account Email |
| `FIREBASE_PRIVATE_KEY` | Your Firebase Private Key (wrapped in quotes) |
| `ANTHROPIC_API_KEY` | Your Anthropic API Key |
| `MAX_REQUESTS_PER_DAY` | `100` |
| `MAX_LIFETIME_REQUESTS` | `20` |

> [!IMPORTANT]
> Ensure the `FIREBASE_PRIVATE_KEY` includes the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts and that newlines are handled correctly.

## Step 4: Deploy the Container

Use the provided `backend/deploy-azure.sh` script or follow these steps:

1. **Login to ACR**:
   ```bash
   az acr login --name externairegistry
   ```

2. **Build and Tag**:
   ```bash
   cd backend
   docker build -t externairegistry.azurecr.io/externai-backend:v1 .
   ```

3. **Push to ACR**:
   ```bash
   docker push externairegistry.azurecr.io/externai-backend:v1
   ```

4. **Enable Managed Identity** (Recommended for ACR access):
   - In Azure Portal, go to Web App > **Identity** > **System assigned** > **On**.
   - Grant the Web App "AcrPull" permissions on the ACR.

## Step 5: Update Frontend

Once deployed, copy your Web App URL (e.g., `https://externai-backend.azurewebsites.net`) and update your root `.env` file:

```env
VITE_BACKEND_URL=https://externai-backend.azurewebsites.net
```

Restart your local dev server to test the connection.
