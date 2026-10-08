# NeoZaar Backend API

A Node.js Express backend for the NeoZaar SaaS platform with PostgreSQL database.

## Tech Stack

- Node.js + Express.js
- PostgreSQL with JSONB support
- JWT for authentication
- bcrypt for password hashing
- nodemailer for OTP
- dotenv for configuration

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a PostgreSQL database
4. Configure environment variables in `.env` file
5. Run the SQL scripts in `src/config/db.sql` to set up the database schema
6. Create and Run the SQL scripts in `src/config/update_schema.sql` to update the schema 
7. Start the server: `npm start` or `npm run dev` for development

## API Endpoints

### Authentication Routes

- **POST /api/user/login** - User login
- **POST /api/admin/login** - Admin login
- **POST /api/isv/login** - ISV login
- **POST /api/partner/login** - Partner login
- **POST /api/forget-password** - Request password reset
- **POST /api/reset-password** - Reset password with token
- **POST /api/verify-email** - Verify email with OTP
- **POST /api/send-otp** - Send OTP for verification

### User Routes

- **POST /api/user/create** - Create a new user
- **POST /api/user/update** - Update user information
- **GET /api/user/:id** - Get user by ID
- **DELETE /api/user/:id** - Delete user

### Product Routes

- **POST /api/products/create** - Create a new product
- **POST /api/products/update/:id** - Update product
- **GET /api/products** - Get products with pagination and filtering
- **GET /api/products/:id** - Get product by ID
- **GET /api/products/get-details** - Get detailed product information

### Enquiry Routes

- **POST /api/enquiries/create** - Create a new enquiry
- **POST /api/enquiries/update-status/:id** - Update enquiry status
- **GET /api/enquiries** - Get all enquiries
- **GET /api/enquiries/user/:userId** - Get enquiries by user

### Enum Routes

- **GET /api/enums** - Get all enums or filter by name

## Authentication

All routes except login, OTP, and password reset routes require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database Schema

The database schema includes the following tables:

- `users` - All users with role-based access
- `client_users` - Client-specific user data
- `isv_users` - ISV-specific user data
- `partner_users` - Partner-specific user data
- `products` - Product information
- `taxonomy_products` - Product taxonomy data in JSONB format
- `enquiries` - User enquiries for products
- `enums` - Enum values in JSONB format

## Environment Variables

Create a `.env` file with the following variables:

```
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=neozaar_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Email Configuration (for OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```


<!-- Security scan triggered at 2025-09-02 02:31:27 -->

<!-- Security scan triggered at 2025-09-09 05:35:08 -->

<!-- Security scan triggered at 2025-09-28 15:38:12 -->