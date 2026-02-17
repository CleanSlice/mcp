# API Docker Services

Local development services for the API. Run with `docker-compose up -d`.

---

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check running containers
docker-compose ps

# Stop all services
docker-compose down
```

---

## Services

### PostgreSQL

Local database for development.

| Setting | Value |
|---------|-------|
| Port | `5432` |
| Password | `root` |
| Database | `cleanslice-api-local-database` |

```bash
# Connect via psql
psql -h localhost -U postgres -d cleanslice-api-local-database
```

---

### S3 (LocalStack)

Local S3-compatible storage for file uploads.

| Setting | Value |
|---------|-------|
| Port | `19025` |
| Bucket | `cleanslice-api-local-static` |

#### Initialization Required

After starting the container for the first time, you must create the bucket:

```bash
# Create bucket
aws --endpoint-url=http://localhost:19025 s3api create-bucket \
  --bucket cleanslice-api-local-static

# Set bucket policy (allows public read/write)
aws --endpoint-url=http://localhost:19025 s3api put-bucket-policy \
  --bucket cleanslice-api-local-static \
  --policy file://scripts/s3-local-policy.json
```

#### Common Error

If you see this error in the browser console:

```
PUT http://localhost:19025/cleanslice-api-local-static/... net::ERR_FAILED
```

**Cause**: The S3 bucket hasn't been initialized.

**Fix**: Run the initialization commands above.

#### Bucket Policy

Create `scripts/s3-local-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cleanslice-api-local-static/*"
    },
    {
      "Sid": "PublicWriteObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::cleanslice-api-local-static/*"
    }
  ]
}
```

---

## Optional Services

Uncomment in `docker-compose.yml` as needed.

### DynamoDB Local

```yaml
dynamodb-local:
  image: 'amazon/dynamodb-local:latest'
  ports:
    - '8000:8000'
  volumes:
    - './docker/dynamodb:/home/dynamodblocal/data'
```

### Redis

```yaml
redis-local:
  image: redis:latest
  ports:
    - '6379:6379'
```

### OpenSearch

```yaml
opensearch-local:
  image: opensearchproject/opensearch:latest
  ports:
    - 9200:9200
    - 9600:9600
  environment:
    - discovery.type=single-node
    - DISABLE_SECURITY_PLUGIN=true
```

Dashboard available at `http://localhost:5601` (requires opensearch-dashboards service).

### Neo4j

```yaml
neo4j-local:
  image: neo4j:4.4.35-community
  ports:
    - 7888:7474  # HTTP
    - 7999:7687  # Bolt
  environment:
    - NEO4J_AUTH=neo4j/test
```

### Step Functions Local

```yaml
step-functions-local:
  image: amazon/aws-stepfunctions-local
  ports:
    - '8083:8083'
```

---

## Troubleshooting

### Container not starting

```bash
# Check logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>
```

### Port already in use

```bash
# Find process using port
lsof -i :<port>

# Kill process
kill -9 <pid>
```

### Reset data

```bash
# Stop containers and remove volumes
docker-compose down -v

# Remove local data
rm -rf docker/postgresql docker/s3
```
