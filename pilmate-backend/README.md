# Pilmate Backend - Medicine Inventory System

A production-ready NestJS backend for multi-tenant medicine inventory management with Supabase, Prisma, and TypeScript.

## Features

- **Multi-tenant Architecture**: Each store has isolated data
- **Supabase Authentication**: JWT-based auth with Supabase
- **Inventory Management**: Track medicines, stock levels, categories, expiry dates
- **Sales & POS**: Record sales, generate invoices, track payments
- **Purchase Orders**: Manage supplier orders and stock replenishment
- **Reports & Analytics**: Sales reports, inventory analytics, dashboards
- **Role-based Access Control**: OWNER, MANAGER, STAFF roles
- **Type-safe Database**: Prisma ORM with PostgreSQL

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7+
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6
- **Authentication**: Supabase Auth + JWT
- **Validation**: class-validator + class-transformer

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project
- PostgreSQL connection string from Supabase

## Setup Instructions

### 1. Clone and Install

```bash
cd pilmate-backend
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (Supabase PostgreSQL connection string)
DATABASE_URL="postgresql://postgres.[project-id]:your-password@aws-0-region.pooler.supabase.com:5432/postgres?schema=public"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Application
PORT=3000
NODE_ENV=development
```

**Get your Supabase credentials:**
1. Go to Supabase Dashboard > Your Project
2. Settings > API for URL and keys
3. Settings > Database > Connection string for DATABASE_URL

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view/edit data
npm run prisma:studio
```

### 4. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at: `http://localhost:3000/api/v1`

## Project Structure

```
pilmate-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── common/                # Shared utilities
│   │   ├── decorators/        # Custom decorators
│   │   ├── guards/           # Auth & role guards
│   │   ├── interceptors/     # Request interceptors
│   │   ├── filters/          # Exception filters
│   │   ├── pipes/            # Validation pipes
│   │   └── interfaces/       # TypeScript interfaces
│   ├── config/               # Configuration files
│   ├── modules/              # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── stores/          # Store management
│   │   ├── products/        # Inventory management
│   │   ├── sales/           # Sales & POS
│   │   ├── purchases/       # Purchase orders
│   │   └── reports/         # Analytics & reports
│   ├── database/            # Database service
│   ├── main.ts              # Entry point
│   └── app.module.ts        # Root module
├── .env                     # Environment variables
├── .env.example            # Environment template
├── Dockerfile              # Docker configuration
└── docker-compose.yml      # Docker Compose
```

## API Endpoints

All endpoints are prefixed with `/api/v1`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `GET /auth/profile` - Get user profile

### Stores
- `GET /stores` - List all stores
- `GET /stores/:id` - Get store details
- `POST /stores` - Create new store
- `PATCH /stores/:id` - Update store
- `DELETE /stores/:id` - Delete store

### Products (Inventory)
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `POST /products` - Add new product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Sales
- `GET /sales` - List sales
- `GET /sales/:id` - Get sale details
- `POST /sales` - Create new sale
- `PATCH /sales/:id` - Update sale

### Purchases
- `GET /purchases` - List purchase orders
- `GET /purchases/:id` - Get purchase order
- `POST /purchases` - Create purchase order
- `PATCH /purchases/:id` - Update purchase order

### Reports
- `GET /reports/sales` - Sales analytics
- `GET /reports/inventory` - Inventory status
- `GET /reports/revenue` - Revenue reports

## Database Schema

### Core Models

- **Store**: Multi-tenant store information
- **User**: Store staff with roles (OWNER, MANAGER, STAFF)
- **Product**: Medicine inventory with stock tracking
- **Sale**: Sales transactions with items
- **PurchaseOrder**: Supplier purchase orders
- **SaleItem/PurchaseItem**: Line items for sales and purchases

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop containers
docker-compose down
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `JWT_EXPIRATION` | JWT token expiration | No (default: 7d) |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |

## Security Features

- JWT authentication with Supabase
- Role-based access control (RBAC)
- Input validation with class-validator
- CORS enabled
- Environment variable protection
- Password hashing with bcrypt

## Next Steps

After setup, you should:

1. ✅ Configure Supabase authentication
2. ✅ Implement JWT strategy
3. ✅ Add CRUD operations for each module
4. ✅ Implement business logic (stock management, sales processing)
5. ✅ Create report endpoints
6. ✅ Add unit and integration tests
7. ✅ Setup CI/CD pipeline
8. ✅ Deploy to production (Render, Railway, AWS, etc.)

## Support

For support, email your-email@example.com or open an issue in the repository.

## License

This project is licensed under the MIT License.
