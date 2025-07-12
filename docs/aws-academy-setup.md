# AWS Academy Configuration Guide

## AWS Academy Setup

### Prerequisites
- AWS Academy Learner Lab access
- LabRole permissions (automatic)
- AWS CLI configured with Academy credentials

### Academy Specific Configuration

#### 1. Credentials Setup
```bash
# Get credentials from AWS Academy Lab
# Copy from "AWS Details" -> "AWS CLI"
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set aws_session_token YOUR_SESSION_TOKEN
aws configure set region us-east-1
```

#### 2. Environment Variables for Academy
```bash
# Set AWS Account ID (get from Academy lab)
export AWS_ACCOUNT_ID=123456789012

# Set Lab Role ARN
export LAB_ROLE_ARN=arn:aws:iam::123456789012:role/LabRole
```

#### 3. Bucket Naming for Academy
Academy requires unique bucket names:
```bash
# Use your student ID or unique identifier
export STUDENT_ID=your-student-id
export S3_BUCKET=cloudpf-data-lake-${STUDENT_ID}-dev
```

### Academy Limitations

#### Services Available:
- ✅ Lambda Functions
- ✅ DynamoDB (with streams)
- ✅ S3 Buckets
- ✅ API Gateway
- ✅ CloudWatch Logs
- ✅ Athena (limited)
- ❌ ElasticSearch Service (restricted)
- ❌ VPC Configuration
- ❌ Custom IAM Roles

#### Workarounds:

1. **ElasticSearch Alternative**:
   - Use DynamoDB with Global Secondary Index
   - Use DocumentDB (if available)
   - Use external ElasticSearch (Docker local)

2. **IAM Permissions**:
   - Use LabRole (has most permissions)
   - No custom role creation needed

3. **VPC/Networking**:
   - Use default VPC
   - No custom security groups

### Modified Architecture for Academy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DynamoDB      │    │   Lambda CDC    │    │   DynamoDB      │
│   Products      │───▶│   Processor     │───▶│   Search Index  │
│   (with streams)│    │   (LabRole)     │    │   (GSI)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   S3 Bucket     │
                       │   Data Lake     │
                       │   (CSV/JSON)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Athena        │
                       │   Analytics     │
                       │   (SQL Queries) │
                       └─────────────────┘
```

### Academy Deployment Commands

```bash
# Deploy with Academy constraints
npm run deploy:academy

# Alternative: Manual deployment
serverless deploy --stage academy --region us-east-1
```

### Cost Optimization for Academy

```yaml
# Keep costs low for Academy
custom:
  # Smaller table configurations
  dynamoTableProductos: "Productos-academy"
  dynamoTableCompras: "Compras-academy"
  
  # Smaller S3 bucket
  s3Bucket: "cloudpf-data-${self:provider.stage}-${aws:accountId}"
  
  # Basic Athena setup
  athenaDatabase: "cloudpf_academy"
```

### Testing in Academy

```bash
# Test with Academy limits
npm run test:academy

# Monitor costs
aws ce get-cost-and-usage --help
```

### Common Academy Issues

1. **Session Timeout**: Credentials expire after 4 hours
2. **Resource Limits**: Some services have quotas
3. **Region Restrictions**: Usually us-east-1 only
4. **Cleanup Required**: Delete resources after labs

### Cleanup Script for Academy

```bash
# Clean up all resources
npm run cleanup:academy
```

This ensures you don't exceed Academy limits or leave resources running.
