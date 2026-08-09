# TechStore AWS --- Manually Deployed Three-Tier E-Commerce Application

A production-style e-commerce application manually configured and
deployed on Amazon Web Services (AWS).

The project demonstrates a highly available three-tier architecture with
separate web, application, and database tiers, load balancing, Auto
Scaling, private networking, centralized secret management, monitoring,
auditing, and operational notifications.

> **Deployment model:** AWS infrastructure was configured manually
> through the AWS Management Console and EC2/CLI administration. No
> Infrastructure-as-Code framework is required for the deployed
> architecture.

## Architecture

``` 
```

Supporting services include S3, IAM, AWS Secrets Manager, SSM Session
Manager, CloudWatch, SNS, CloudTrail, and VPC Flow Logs.

## AWS Infrastructure

### Networking

-   VPC: `MY-VPC`
-   CIDR: `10.0.0.0/16`
-   Region: `ap-south-1` (Mumbai)
-   Two Availability Zones
-   Six subnets:
    -   2 Web-tier subnets
    -   2 App-tier subnets
    -   2 DB-tier subnets
-   Internet Gateway
-   Two NAT Gateways
-   Separate route tables
-   Dedicated security groups for the external ALB, web tier, internal
    ALB, app tier, and database tier

### Traffic Flow

``` text
Client
  -> Route 53
  -> External Application Load Balancer
  -> Web EC2 / Nginx
  -> Internal Application Load Balancer
  -> App EC2 / Node.js
  -> Amazon RDS MySQL
```

The application and database tiers are not intended to be directly
exposed to the public Internet.

## Web Tier

The web tier uses:

-   Amazon Linux EC2
-   Nginx
-   React production build
-   Auto Scaling Group
-   Launch Template
-   AMI
-   External Application Load Balancer

Nginx routes:

``` text
/          -> React application
/api/*     -> Internal ALB
/images/*  -> Internal ALB
/health    -> Web-tier health check
```

## Application Tier

The backend uses:

-   Node.js
-   Express
-   MySQL2
-   JWT authentication
-   bcrypt password hashing
-   Role-based authorization
-   PM2
-   AWS SDK
-   AWS Secrets Manager
-   Structured application logging

The application listens on `0.0.0.0:4000`.

### API Areas

``` text
POST /auth/register
POST /auth/login
GET  /auth/me

GET    /products
GET    /products/:id
POST   /products
PUT    /products/:id
DELETE /products/:id

POST /orders
GET  /orders
GET  /orders/:id
PUT  /orders/:id/status
```

## Database

Amazon RDS for MySQL is the persistence layer.

Primary tables:

``` text
users
products
orders
order_items
```

Order creation uses database transactions and row locking to maintain
stock consistency during concurrent purchases.

The deployed database configuration included MySQL 8.4, Multi-AZ
deployment, encrypted storage, and a DB subnet group spanning both
Availability Zones.

## Security

### Security-Group Isolation

``` text
Internet
   |
External ALB
   |
Web Tier
   |
Internal ALB
   |
App Tier
   |
RDS MySQL :3306
```

Each tier uses a dedicated security group and tier-to-tier access is
restricted.

### AWS Secrets Manager

Application secrets are stored in AWS Secrets Manager rather than
production credentials being committed to the application repository.

### AWS Systems Manager Session Manager

SSM Session Manager is used for secure EC2 administration without
requiring publicly exposed SSH access.

> **SSM Session Manager** is used for EC2 access; **AWS Secrets
> Manager** is used for application secrets.

### IAM

EC2 instances use IAM roles for required access to:

-   Amazon S3
-   AWS Systems Manager
-   AWS Secrets Manager

## High Availability and Scaling

The architecture is distributed across two Availability Zones.

Both Web and App tiers use Auto Scaling Groups and load-balancer health
checks.

The App Auto Scaling Group was configured with:

``` text
Minimum: 2
Desired: 2
Maximum: 4
```

The architecture provides:

-   Multi-AZ redundancy
-   Instance replacement
-   Horizontal scaling
-   Load-balancer integration

AMI and Launch Template based provisioning provides repeatable EC2
configuration.

## S3

Amazon S3 is used for:

-   Application/deployment artifacts
-   VPC Flow Logs
-   CloudTrail logging

Deployment flow:

``` text
Application repository
        |
        v
       S3
        |
        v
EC2 deployment / bootstrap
        |
        v
Application
```

## Monitoring and Operations

### CloudWatch

Used for infrastructure metrics and alarms, including EC2 and
load-balancer related monitoring.

### SNS

Used for operational notifications, including Auto Scaling events.

``` text
AWS event
   |
SNS topic
   |
Email notification
```

### CloudTrail

Provides an audit trail of AWS API activity and account-level events.

### VPC Flow Logs

Provides network-level visibility with logs stored in S3.

``` text
CloudWatch    -> Metrics and alarms
SNS           -> Notifications
CloudTrail    -> AWS API auditing
VPC Flow Logs -> Network visibility
```

## Route 53

Route 53 provides DNS for the application and routes traffic to the
external Application Load Balancer through ALB alias routing.

## Application Features

### Customer

-   Registration and login
-   Product browsing
-   Search and filtering
-   Product details
-   Shopping cart
-   Checkout
-   Order creation
-   Order history

### Admin

-   Admin authentication
-   Product management
-   Order management
-   Order status updates
-   Dashboard and order statistics

## Manual Deployment Process

``` text
1. Create VPC and networking
2. Create public/private subnets
3. Configure route tables, IGW and NAT gateways
4. Configure security groups
5. Deploy and configure RDS
6. Deploy application EC2
7. Configure Node.js, PM2 and application
8. Deploy web EC2
9. Configure React build and Nginx
10. Create AMIs
11. Create Launch Templates
12. Configure Auto Scaling Groups
13. Configure internal and external ALBs
14. Configure Route 53
15. Configure S3
16. Configure IAM roles
17. Configure Secrets Manager
18. Configure SSM Session Manager
19. Configure CloudWatch and SNS
20. Configure CloudTrail and VPC Flow Logs
21. Validate application and infrastructure health
```

## Documentation

The project documentation contains evidence covering:

-   VPC and subnet architecture
-   Route tables and NAT
-   Security groups
-   EC2 and AMIs
-   Launch Templates
-   Auto Scaling Groups
-   External and internal load balancers
-   RDS and DB subnet groups
-   S3
-   Route 53
-   IAM
-   SSM Session Manager
-   Secrets Manager
-   CloudWatch
-   SNS
-   CloudTrail
-   VPC Flow Logs
-   Application functionality

## Key Technologies

**Frontend** - React

**Backend** - Node.js - Express - MySQL2 - JWT - bcrypt - PM2

**AWS** - VPC - EC2 - ALB - Auto Scaling - RDS - Route 53 - S3 - IAM -
Secrets Manager - Systems Manager - CloudWatch - SNS - CloudTrail - VPC
Flow Logs

## Project Status

The AWS environment was deployed and validated successfully and was
subsequently deleted after completion to avoid ongoing AWS
infrastructure costs.

The repository and deployment documentation preserve the implementation
details and evidence of the deployed architecture.

## Author

**Akshay**
