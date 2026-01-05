# Clinic Invoice Management System

A comprehensive web application for managing clinic invoices built with Next.js, TypeScript, Tailwind CSS, MySQL, and Prisma ORM.

## Features

### Authentication & Authorization
- Single login panel for all users
- Role-based access control
- Only authorized users can create new users
- System Admin with full access
- Password change functionality

### User Management
- Create users with initial passwords
- Role assignment
- System Admin can change any user's password

### Product Management
- Create and manage product categories
- Default "Uncategorised" category
- Add products with price and description
- Category-based organization

### Invoice Creation
- Dynamic product selection
- Quantity-based calculations
- Automatic total calculation
- PDF generation capability
- Invoice numbering system

### Role Management
- Customizable permissions:
  - CREATE_USER
  - MANAGE_PRODUCTS
  - CREATE_INVOICE
  - MANAGE_CATEGORIES
  - VIEW_ALL_INVOICES
  - SYSTEM_ADMIN

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **PDF Generation**: jsPDF, html2canvas

## Setup Instructions

### 1. Database Setup

1. **Install MySQL** (if not already installed):
   ```bash
   # On macOS with Homebrew
   brew install mysql
   brew services start mysql
   
   # On Ubuntu/Debian
   sudo apt update
   sudo apt install mysql-server
   sudo systemctl start mysql
   ```

2. **Create Database**:
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE invoicemaker;
   CREATE USER 'invoice_user'@'localhost' IDENTIFIED BY 'your_password_here';
   GRANT ALL PRIVILEGES ON invoicemaker.* TO 'invoice_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

3. **Update Environment Variables**:
   Edit the `.env` file and update the DATABASE_URL:
   ```env
   DATABASE_URL="mysql://invoice_user:your_password_here@localhost:3306/invoicemaker"
   ```

### 2. Application Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Run Database Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the Database**:
   ```bash
   npm run db:seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. **Access the Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Default Login Credentials

After running the seed command, you can log in with:

- **Email**: admin@clinic.com
- **Password**: admin123

This is the System Admin account with full permissions.

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/           # NextAuth configuration
│   │   ├── categories/     # Category management
│   │   ├── invoices/       # Invoice operations
│   │   └── products/       # Product management
│   ├── dashboard/          # Main dashboard
│   ├── invoices/          # Invoice pages
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
├── lib/                  # Utility functions
├── prisma/              # Database schema and migrations
├── types/               # TypeScript type definitions
└── README.md           # This file
```

## Usage

### 1. User Management
- System Admin can create new users
- Assign roles with specific permissions
- Change user passwords

### 2. Product Management
- Create categories for better organization
- Add products with prices and descriptions
- Edit and delete products (with proper permissions)

### 3. Invoice Creation
- Select products and quantities
- Automatic price calculations
- Generate and download PDF invoices
- Track invoice history

### 4. Role Management
- System Admin can create and modify roles
- Assign specific permissions to roles
- Control access to different system features

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category

### Invoices
- `GET /api/invoices` - Get invoices (with pagination)
- `POST /api/invoices` - Create new invoice

## Environment Variables

```env
DATABASE_URL="mysql://username:password@localhost:3306/invoicemaker"
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Development

### Database Changes
When making schema changes:

1. Update `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev --name description`
3. Generate client: `npx prisma generate`

### Adding New Features
1. Create API routes in `app/api/`
2. Add corresponding UI components
3. Update types if needed
4. Test with appropriate user roles

## Production Deployment

1. Set up production MySQL database
2. Update environment variables
3. Build the application: `npm run build`
4. Run migrations: `npx prisma migrate deploy`
5. Start the application: `npm start`

## License

This project is for educational and business use.
