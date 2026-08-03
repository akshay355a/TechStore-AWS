# TechStore App Tier

Production Node.js/Express application tier for EC2 behind an internal Application Load Balancer.

## Runtime requirements

- Node.js 20 or newer
- Network access from the app-tier security group to RDS MySQL on port 3306
- Network access to AWS Secrets Manager through a NAT gateway or VPC interface endpoint
- An EC2 instance profile that can read `cloudinv/database`
- A deployment/seeding identity that can read both `cloudinv/database` and `cloudinv/admin`
- `AWS_REGION` or `AWS_DEFAULT_REGION` set to the Region containing the secret
- The Amazon RDS CA bundle installed on the instance
- The schema in `../database/schema.sql` applied to the RDS database before startup

Install production dependencies:

```sh
npm ci --omit=dev
```

Install PM2 globally on the application AMI or during instance bootstrap:

```sh
npm install --global pm2
```

## AWS secrets

Create the `cloudinv/database` secret in the same AWS Region as the EC2 instances:

```json
{
  "host": "your-rds-endpoint",
  "username": "your-database-user",
  "password": "your-database-password",
  "database": "ecommerce",
  "port": 3306,
  "JWT_SECRET": "a-long-random-signing-secret"
}
```

`JWT_SECRET` remains in the existing application secret to preserve the current authentication configuration. The admin seed command reads only the database fields and never depends on `JWT_SECRET`.

Create a separate `cloudinv/admin` secret:

```json
{
  "email": "admin@techstore.com",
  "password": "VeryStrongPassword",
  "name": "Administrator"
}
```

Never add admin credentials to `cloudinv/database`. Do not store either secret in the repository, user data, an AMI, or PM2 configuration. All application instances must read the same `JWT_SECRET` so tokens issued by one instance are valid on another.

Minimum application instance-role permission:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:cloudinv/database-*"
    }
  ]
}
```

The deployment or seeding identity needs the same action for both secret ARNs while running `npm run seed:admin`. Do not grant the long-running application role access to `cloudinv/admin`. Add `kms:Decrypt` for each secret's KMS key when customer-managed keys are used.

## Runtime configuration

The application uses the default AWS SDK credential provider chain. On EC2, use an instance profile rather than static access keys.

Required environment variables:

- `AWS_REGION` or `AWS_DEFAULT_REGION`: Region containing the secret
- `RDS_CA_BUNDLE_PATH`: absolute path to the Amazon RDS CA bundle

Optional environment variables:

- `PORT`: Express listening port; defaults to `4000`
- `DB_CONNECTION_LIMIT`: maximum MySQL connections per Node.js process; defaults to `10`

Install the current global RDS bundle during AMI creation or instance bootstrap rather than downloading it in the application process:

```sh
sudo mkdir -p /etc/pki/rds
sudo curl --fail --silent --show-error \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  --output /etc/pki/rds/global-bundle.pem
sudo chmod 0644 /etc/pki/rds/global-bundle.pem
export RDS_CA_BUNDLE_PATH=/etc/pki/rds/global-bundle.pem
```

Size `DB_CONNECTION_LIMIT` against the RDS connection limit multiplied by the maximum number of EC2 instances. The application refuses to initialize the pool without the CA bundle and validates the RDS certificate chain.

## Admin provisioning

The schema contains no users or other application data. After applying the schema and creating both secrets, run:

```sh
npm run seed:admin
```

The command hashes the password with bcrypt, verifies the RDS connection, checks the unique email, and inserts the user with role `admin` only when absent. Repeated or concurrent executions do not create duplicates. If the admin already exists, it prints `Admin already exists.` and exits successfully.

Missing or malformed secrets, bcrypt failures, CA bundle errors, database connection failures, and query failures produce a structured error and a non-zero exit status.

## Deployment order

1. Create the RDS MySQL database.
2. Apply `../database/schema.sql`.
3. Create `cloudinv/database`.
4. Create `cloudinv/admin`.
5. Run `npm run seed:admin` from the app-tier release directory.
6. Start the application with PM2.

Do not start application instances before the schema and required production admin have been provisioned.

## Startup and failure behavior

Startup is intentionally fail-closed:

1. Read and validate `cloudinv/database` from Secrets Manager.
2. Create the MySQL pool.
3. Acquire a connection and ping RDS.
4. Initialize JWT signing.
5. Start Express on `0.0.0.0`.

If secret retrieval, validation, CA bundle loading, or the database check fails, the process logs a structured error and exits with status 1. Express never starts in a degraded or mock mode.

The internal ALB health check can use `GET /health` on the configured application port. PM2 receives `SIGTERM` during replacement or scale-in; the application stops accepting requests and closes its pool.

Start with PM2:

```sh
npm run start:pm2
pm2 save
```

## Migration notes

- The previous `DbConfig.js` credential fields are removed. Do not populate that file with RDS values.
- The JSON mock database and `transactions.json` fallback are removed. No runtime data is written to local EC2 storage.
- Existing JSON mock data is not migrated automatically. Import any required data into RDS before deployment.
- `../database/schema.sql` contains only database and table definitions; its hardcoded admin insert was deleted.
- Provision the production admin with `npm run seed:admin`. The command is idempotent and reads credentials only from `cloudinv/admin`.
- `../database/schema.sql` still selects the `ecommerce` database. Keep the secret's `database` value aligned with it.
- The existing schema contains no `transactions` table. `TransactionService.js` remains for compatibility, but it requires that table if any legacy caller uses it.
- Secret values are loaded once per process. Restart PM2 processes after rotating database credentials or `JWT_SECRET`; changing `JWT_SECRET` invalidates previously issued tokens.
