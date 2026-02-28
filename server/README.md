# MHEMA Express Logistics - Backend Setup Instructions

## Prerequisites

Make sure you have:
- Node.js v18+ installed
- PostgreSQL installed and running
- Database created: `rmhemadb`

## Setup Steps

### 1. Navigate to server directory
```bash
cd server
```

### 2. Create .env file
Create a file named `.env` in the server folder with the following content:

```env
DATABASE_URL="postgresql://postgres:myamba2323@localhost:5432/rmhemadb?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET=mhema_express_jwt_secret_key_change_in_production_2025
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
```

### 3. Install dependencies
```bash
npm install
```

### 4. Generate Prisma Client
```bash
npx prisma generate
```

### 5. Push database schema
```bash
npx prisma db push
```

### 6. Seed the database
```bash
npm run db:seed
```

### 7. Start the server
```bash
npm run dev
```

The server will run on http://localhost:3000

## Test Credentials

After seeding, you can use these credentials:

- **Admin**: admin@mhema.co.tz / admin123
- **Agent**: agent1@mhema.co.tz / agent123  
- **Customer**: customer1@example.com / customer123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (Agent/Admin)
- `PATCH /api/orders/:id/payment` - Confirm payment (Agent/Admin)
- `PATCH /api/orders/:id/assign` - Reassign order (Admin)

### Agents
- `GET /api/agents` - List agents (Admin) or get own info (Agent)
- `POST /api/agents` - Create agent (Admin)
- `GET /api/agents/:id/stats` - Get agent statistics
- `PATCH /api/agents/:id/status` - Update availability status
- `PATCH /api/agents/:id` - Update agent details (Admin)

### Payment QR Codes
- `GET /api/payment-qr-codes` - List active QR codes
- `POST /api/payment-qr-codes` - Upload QR code (Admin)
- `DELETE /api/payment-qr-codes/:id` - Deactivate QR code (Admin)

### Transport Methods
- `GET /api/transport-methods` - List active methods
- `POST /api/transport-methods` - Create method (Admin)
- `PATCH /api/transport-methods/:id` - Update method (Admin)
- `DELETE /api/transport-methods/:id` - Deactivate method (Admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard metrics (role-based)
- `GET /api/analytics/sales` - Get sales data for charts (Admin)
- `GET /api/analytics/agents` - Get agent performance (Admin)

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running
- Verify database credentials in .env
- Ensure database `rmhemadb` exists

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Database Schema Issues
```bash
npx prisma db push --force-reset
npm run db:seed
```

### Port Already in Use
Change the PORT in .env file to a different port number.
