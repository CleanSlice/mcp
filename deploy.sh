#!/bin/bash
set -e

# Configuration
ENV=${1:-dev}
AWS_REGION=${2:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="cleanslice-mcp-${ENV}-ecr"
IMAGE_TAG=${3:-latest}

echo "🚀 Deploying MCP Server to ${ENV}"
echo "📦 ECR Repository: ${ECR_REPOSITORY}"
echo "🏷️  Image Tag: ${IMAGE_TAG}"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .

# Get ECR login token
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag image for ECR
echo "🏷️  Tagging image..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Push to ECR
echo "📤 Pushing to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Update ECS service to use new image
echo "🔄 Updating ECS service..."
CLUSTER_NAME="cleanslice-mcp-${ENV}-ecs-cluster"
SERVICE_NAME="cleanslice-mcp-${ENV}-ecs-service"

aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --force-new-deployment \
  --region ${AWS_REGION}

echo "✅ Deployment complete!"
echo "🔍 Monitor deployment:"
echo "   aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION}"