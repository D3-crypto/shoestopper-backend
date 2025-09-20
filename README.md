# 🛒 ShoeStopper - Complete E-commerce Backend

**Enterprise-grade Node.js + Express + MongoDB e-commerce platform for shoe retail with advanced authentication, inventory management, analytics, and automated email communications.**

## 🎯 **Project Overview**

ShoeStopper is a comprehensive e-commerce backend specifically designed for shoe retail businesses. It provides everything needed to run a modern online shoe store with sophisticated features like variant-based inventory, secure authentication, order management, business analytics, newsletter subscriptions, and automated customer communications.

## ✨ **Core Features**

### 🔐 **Advanced Authentication System**
- **Email-based Registration**: OTP verification with auto-cleanup of unverified accounts
- **Smart Security**: Failed login protection with automatic account locking (5 attempts)
- **JWT Token Management**: Access tokens (15min) + refresh token rotation (30 days)
- **Password Recovery**: OTP-based secure password reset
- **Session Management**: Automatic breach detection and token revocation

### 👤 **User Management**
- **Complete Profiles**: Name, email, phone, verification status
- **Address Management**: Multiple addresses (max 5) with default selection
- **Account Security**: Email verification, login blocking/unblocking
- **Order History**: Comprehensive tracking with filtering and search

### 🛍️ **Product & Inventory System**
- **Product Catalog**: Title, description, pricing, categories, images
- **Variant System**: Color and size combinations with individual stock tracking
- **Real-time Inventory**: Atomic stock management prevents overselling
- **Search & Filtering**: Text search, category, color, size filters

### 🛒 **Shopping Experience**
- **Shopping Cart**: Multi-variant items with quantity management
- **Wishlist**: Save favorite products for later
- **Stock Validation**: Real-time availability checking
- **Smart Recommendations**: Product suggestions and categories

### 💳 **Order & Payment Management**
- **Complete Order Lifecycle**: PaymentPending → Paid → Approved → Shipped → Delivered
- **Multiple Payment Methods**: Cash on Delivery (COD), Card, UPI
- **Order Tracking**: Real-time status updates with history
- **Payment Processing**: OTP-based payment confirmation for security

### 📧 **Email Communications System** ✨ *NEW*
- **Newsletter Subscriptions**: Beautiful HTML newsletters with unsubscribe functionality
- **Order Confirmations**: Professional order confirmation emails with detailed receipts
- **Payment Notifications**: Instant email alerts for successful payments
- **Welcome Emails**: Branded welcome messages for new newsletter subscribers
- **Email Templates**: Responsive HTML designs matching brand identity

### 👨‍💼 **Admin Dashboard**
- **Product Management**: Create/update products and variants
- **Inventory Control**: Real-time stock level management
- **Order Management**: View, filter, and update order status
- **User Management**: Complete customer overview and management
- **Newsletter Management**: View subscriber lists and manage communications
- **Business Analytics**: Sales, inventory, and customer insights

### 📊 **Advanced Analytics**
- **Sales Analytics**: Revenue tracking, top products, daily/monthly reports
- **Inventory Analytics**: Low stock alerts, category breakdowns, value calculations
- **Customer Analytics**: User behavior, top customers, acquisition metrics
- **Transaction Management**: Complete payment tracking and analysis

## 🏗️ **Technical Architecture**

### **Technology Stack**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh token rotation
- **Email Service**: Nodemailer with Gmail SMTP integration ✨ *ENHANCED*
- **Security**: bcrypt password hashing, rate limiting

### **Database Models**
- **User**: Profiles, addresses, verification status
- **Product**: Catalog items with categories and pricing
- **Variant**: Product variations (color/size) with stock
- **Order**: Complete order lifecycle and tracking
- **Cart**: Shopping cart with multi-variant support
- **Wishlist**: Saved products for users
- **Transaction**: Payment processing and tracking
- **OTP**: Temporary codes for verification
- **RefreshToken**: Secure session management
- **Subscriber**: Newsletter subscriptions with unsubscribe tokens ✨ *NEW*

### **Security Features**
- **Password Hashing**: bcrypt with salt rounds
- **JWT Security**: Separate secrets for access/refresh tokens
- **Token Rotation**: Automatic refresh token rotation
- **Rate Limiting**: OTP resend cooldowns
- **Breach Detection**: Automatic token reuse detection
- **Input Validation**: Comprehensive request validation
- **Database Security**: TTL indexes for automatic cleanup

## 🚀 **Quick Start**

### **1. Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/shoestopper-backend.git
cd shoestopper-backend/backend

# Install dependencies
npm install
```

### **2. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configurations
```

**Required Environment Variables:**
```bash
# Database Configuration
MONGO_URI=your_mongodb_connection_string

# JWT Configuration (Generate strong random strings)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=YourApp <noreply@yourapp.com>

# Server Configuration
PORT=4000
NODE_ENV=development
```

**⚠️ Security Note:** Never commit your `.env` file to version control. All sensitive values should be kept private.

### **3. Database Setup**
```bash
# Start MongoDB locally or use MongoDB Atlas
# The application will automatically create collections and indexes
```

### **4. Run the Application**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### **5. Verify Installation**
```bash
# Check if server is running
curl http://localhost:4000/health

# Expected response:
{
  "status": "healthy",
  "environment": "development"
}
```

## 📚 **Complete API Documentation**

### **🔐 Authentication Endpoints**

#### **User Registration**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123"
}

Response: 200 OK
{
  "ok": true,
  "message": "User created, verify OTP sent to email"
}
```

#### **OTP Verification**
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "otpType": "VERIFICATION"
}

Response: 200 OK
{
  "ok": true,
  "message": "Verified"
}
```

#### **Resend OTP**
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otpType": "VERIFICATION"
}

Response: 200 OK
{
  "ok": true,
  "message": "OTP resent"
}
```

#### **User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **Refresh Tokens**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response: 200 OK
{
  "access": "NEW_ACCESS_TOKEN",
  "refresh": "NEW_REFRESH_TOKEN"
}
```

#### **Forgot Password**
```http
POST /api/auth/forgot
Content-Type: application/json

{
  "email": "john@example.com"
}

Response: 200 OK
{
  "ok": true
}
```

#### **Reset Password**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}

Response: 200 OK
{
  "ok": true
}
```

#### **Logout**
```http
POST /api/auth/logout
Content-Type: application/json

{
  "jti": "refresh-token-id"
}

Response: 200 OK
{
  "ok": true
}
```

### **👤 User Management Endpoints**

#### **Get User Profile**
```http
GET /api/users/:userId
Authorization: Bearer ACCESS_TOKEN

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "addresses": [...],
  "defaultAddressId": "507f1f77bcf86cd799439012",
  "verified": true,
  "createdAt": "2025-09-13T10:00:00.000Z"
}
```

#### **Get User Order History (Enhanced with Filters)**
```http
GET /api/users/:userId/orders?status=Delivered&date_from=2025-01-01&date_to=2025-12-31&page=1&limit=10
Authorization: Bearer ACCESS_TOKEN

Response: 200 OK
{
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "orderId": "ORD-2025-001",
      "userId": "507f1f77bcf86cd799439011",
      "items": [
        {
          "productId": {
            "_id": "507f1f77bcf86cd799439014",
            "title": "Nike Air Max 270",
            "images": ["image1.jpg"],
            "price": 150
          },
          "variantId": {
            "_id": "507f1f77bcf86cd799439015",
            "color": "Black",
            "size": "10"
          },
          "qty": 1,
          "price": 150
        }
      ],
      "totalAmount": 150,
      "status": "Delivered",
      "payment": {
        "method": "Card",
        "status": "Paid",
        "transactionId": "TXN-123"
      },
      "statusHistory": [
        {
          "status": "PaymentPending",
          "at": "2025-09-13T10:00:00.000Z"
        },
        {
          "status": "Paid",
          "at": "2025-09-13T10:05:00.000Z"
        },
        {
          "status": "Approved",
          "at": "2025-09-13T11:00:00.000Z"
        },
        {
          "status": "Shipped",
          "at": "2025-09-14T09:00:00.000Z"
        },
        {
          "status": "Delivered",
          "at": "2025-09-15T14:00:00.000Z",
          "note": "Delivered to customer"
        }
      ],
      "createdAt": "2025-09-13T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalOrders": 45,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "message": null
}
```

#### **Search User Orders**
```http
GET /api/users/:userId/orders/search?q=ORD-2025&page=1&limit=10
Authorization: Bearer ACCESS_TOKEN

Response: 200 OK
{
  "orders": [...],
  "searchQuery": "ORD-2025",
  "totalResults": 3,
  "message": null
}
```

#### **Add User Address**
```http
POST /api/users/:userId/addresses
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "label": "Home",
  "line1": "123 Main Street",
  "line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "USA"
}

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439016",
    "label": "Home",
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  }
]
```

#### **Update User Address**
```http
PUT /api/users/:userId/addresses/:addressId
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "label": "Home - Updated",
  "line1": "456 Oak Avenue"
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439016",
  "label": "Home - Updated",
  "line1": "456 Oak Avenue",
  "city": "New York"
}
```

#### **Delete User Address**
```http
DELETE /api/users/:userId/addresses/:addressId
Authorization: Bearer ACCESS_TOKEN

Response: 200 OK
{
  "ok": true
}
```

#### **Set Default Address**
```http
POST /api/users/:userId/addresses/:addressId/default
Authorization: Bearer ACCESS_TOKEN

Response: 200 OK
{
  "ok": true
}
```

### **🛍️ Product Endpoints**

#### **Get All Products (with Filters)**
```http
GET /api/products?category=sneakers&color=black&size=10&q=nike

Response: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "title": "Nike Air Max 270",
    "description": "Comfortable running shoes with Air Max technology",
    "price": 150,
    "categories": ["sneakers", "running"],
    "images": ["image1.jpg", "image2.jpg"],
    "createdAt": "2025-09-13T10:00:00.000Z"
  }
]
```

#### **Get Product Details with Variants**
```http
GET /api/products/:productId

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439014",
  "title": "Nike Air Max 270",
  "description": "Comfortable running shoes with Air Max technology",
  "price": 150,
  "categories": ["sneakers", "running"],
  "images": ["image1.jpg", "image2.jpg"],
  "variants": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "productId": "507f1f77bcf86cd799439014",
      "color": "Black",
      "size": "10",
      "stock": 25,
      "images": ["black_variant.jpg"]
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "productId": "507f1f77bcf86cd799439014",
      "color": "White",
      "size": "10",
      "stock": 15,
      "images": ["white_variant.jpg"]
    }
  ],
  "createdAt": "2025-09-13T10:00:00.000Z"
}
```

### **🛒 Shopping Cart Endpoints**

#### **Get User Cart**
```http
GET /api/cart?userId=507f1f77bcf86cd799439011

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439017",
  "userId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "variantId": {
        "_id": "507f1f77bcf86cd799439015",
        "productId": "507f1f77bcf86cd799439014",
        "color": "Black",
        "size": "10",
        "stock": 25
      },
      "qty": 2
    }
  ],
  "createdAt": "2025-09-13T10:00:00.000Z"
}
```

#### **Add Item to Cart**
```http
POST /api/cart/add
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "variantId": "507f1f77bcf86cd799439015",
  "qty": 2
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439017",
  "userId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "variantId": "507f1f77bcf86cd799439015",
      "qty": 2
    }
  ]
}
```

#### **Remove Item from Cart**
```http
POST /api/cart/remove
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "variantId": "507f1f77bcf86cd799439015"
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439017",
  "userId": "507f1f77bcf86cd799439011",
  "items": []
}
```

### **❤️ Wishlist Endpoints**

#### **Get User Wishlist**
```http
GET /api/wishlist?userId=507f1f77bcf86cd799439011

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439018",
  "userId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "productId": {
        "_id": "507f1f77bcf86cd799439014",
        "title": "Nike Air Max 270",
        "price": 150,
        "images": ["image1.jpg"]
      },
      "addedAt": "2025-09-13T10:00:00.000Z"
    }
  ]
}
```

#### **Add to Wishlist**
```http
POST /api/wishlist/add
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "productId": "507f1f77bcf86cd799439014"
}

Response: 200 OK
{
  "ok": true
}
```

#### **Remove from Wishlist**
```http
POST /api/wishlist/remove
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "productId": "507f1f77bcf86cd799439014"
}

Response: 200 OK
{
  "ok": true
}
```

### **📦 Order Management Endpoints**

#### **Create Order from Cart**
```http
POST /api/orders/create
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "paymentMethod": "Card"
}

Response: 200 OK
{
  "ok": true,
  "orderId": "ORD-2025-001",
  "transactionId": "TXN-123"
}
```

#### **Get Order Details**
```http
GET /api/orders/:orderId

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439013",
  "orderId": "ORD-2025-001",
  "userId": "507f1f77bcf86cd799439011",
  "items": [...],
  "totalAmount": 150,
  "status": "PaymentPending",
  "payment": {
    "method": "Card",
    "transactionId": "TXN-123",
    "status": "PaymentPending"
  },
  "statusHistory": [...]
}
```

#### **Initiate Payment**
```http
POST /api/orders/pay/initiate
Content-Type: application/json

{
  "orderId": "ORD-2025-001",
  "method": "Card"
}

Response: 200 OK
{
  "ok": true,
  "transactionId": "TXN-123"
}
```

#### **Confirm Payment with OTP**
```http
POST /api/orders/pay/confirm
Content-Type: application/json

{
  "orderId": "ORD-2025-001",
  "transactionId": "TXN-123",
  "otp": "123456"
}

Response: 200 OK
{
  "ok": true
}
```

#### **Cancel Order**
```http
POST /api/orders/:orderId/cancel
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "reason": "Changed mind"
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439013",
  "status": "Cancelled",
  "statusHistory": [...]
}
```

### **👨‍💼 Admin Endpoints**

#### **Create Product**
```http
POST /api/admin/product
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Nike Air Max 270",
  "description": "Comfortable running shoes",
  "price": 150,
  "categories": ["sneakers", "running"],
  "images": ["image1.jpg", "image2.jpg"]
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439014",
  "title": "Nike Air Max 270",
  "description": "Comfortable running shoes",
  "price": 150,
  "categories": ["sneakers", "running"],
  "images": ["image1.jpg", "image2.jpg"],
  "createdAt": "2025-09-13T10:00:00.000Z"
}
```

#### **Create Product Variant**
```http
POST /api/admin/variant
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439014",
  "color": "Black",
  "size": "10",
  "stock": 50,
  "images": ["black_variant.jpg"]
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439015",
  "productId": "507f1f77bcf86cd799439014",
  "color": "Black",
  "size": "10",
  "stock": 50,
  "images": ["black_variant.jpg"],
  "createdAt": "2025-09-13T10:00:00.000Z"
}
```

#### **Update Order Status**
```http
POST /api/admin/order/:orderId/status
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json

{
  "status": "Shipped",
  "note": "Package shipped via FedEx, tracking: 1234567890"
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439013",
  "orderId": "ORD-2025-001",
  "status": "Shipped",
  "statusHistory": [
    {
      "status": "PaymentPending",
      "at": "2025-09-13T10:00:00.000Z"
    },
    {
      "status": "Paid",
      "at": "2025-09-13T10:05:00.000Z"
    },
    {
      "status": "Approved",
      "at": "2025-09-13T11:00:00.000Z"
    },
    {
      "status": "Shipped",
      "at": "2025-09-14T09:00:00.000Z",
      "note": "Package shipped via FedEx, tracking: 1234567890"
    }
  ]
}
```

#### **Update Variant Stock**
```http
PUT /api/admin/variant/:variantId/stock
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json

{
  "stock": 75
}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439015",
  "productId": "507f1f77bcf86cd799439014",
  "color": "Black",
  "size": "10",
  "stock": 75
}
```

#### **Get All Orders (Enhanced with Filters)**
```http
GET /api/admin/orders?status=Shipped&userId=507f1f77bcf86cd799439011&paymentMethod=Card&date_from=2025-01-01&search=john@example.com&page=1&limit=20
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "orderId": "ORD-2025-001",
      "userId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "items": [
        {
          "productId": {
            "_id": "507f1f77bcf86cd799439014",
            "title": "Nike Air Max 270",
            "images": ["image1.jpg"],
            "price": 150
          },
          "variantId": {
            "_id": "507f1f77bcf86cd799439015",
            "color": "Black",
            "size": "10"
          },
          "qty": 1,
          "price": 150
        }
      ],
      "totalAmount": 150,
      "status": "Shipped",
      "payment": {
        "method": "Card",
        "status": "Paid",
        "transactionId": "TXN-123"
      },
      "createdAt": "2025-09-13T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalOrders": 58,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalAmount": 8750,
    "averageAmount": 150.86,
    "orderCount": 58
  }
}
```

#### **Get All Users**
```http
GET /api/admin/users?search=john&verified=true&page=1&limit=20
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "verified": true,
      "loginBlocked": false,
      "addresses": [...],
      "createdAt": "2025-09-13T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 95,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### **Get Specific User Details**
```http
GET /api/admin/users/:userId
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "verified": true,
    "addresses": [...],
    "createdAt": "2025-09-13T10:00:00.000Z"
  },
  "statistics": {
    "totalOrders": 15,
    "totalSpent": 2250,
    "averageOrderValue": 150
  },
  "recentOrders": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "orderId": "ORD-2025-001",
      "status": "Delivered",
      "totalAmount": 150,
      "createdAt": "2025-09-13T10:00:00.000Z"
    }
  ]
}
```

#### **Get Specific User's Orders**
```http
GET /api/admin/users/:userId/orders?status=Delivered&page=1&limit=20
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "orders": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalOrders": 15,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### **Get All Transactions**
```http
GET /api/admin/transactions?status=Paid&method=Card&date_from=2025-01-01&page=1&limit=20
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "transactions": [
    {
      "_id": "507f1f77bcf86cd799439019",
      "transactionId": "TXN-123",
      "userId": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "orderId": {
        "_id": "507f1f77bcf86cd799439013",
        "orderId": "ORD-2025-001",
        "totalAmount": 150
      },
      "method": "Card",
      "status": "Paid",
      "createdAt": "2025-09-13T10:05:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 4,
    "totalTransactions": 78,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### **Get Specific Transaction Details**
```http
GET /api/admin/transactions/:transactionId
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439019",
  "transactionId": "TXN-123",
  "userId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "orderId": {
    "_id": "507f1f77bcf86cd799439013",
    "orderId": "ORD-2025-001",
    "totalAmount": 150,
    "items": [
      {
        "productId": {
          "title": "Nike Air Max 270",
          "images": ["image1.jpg"],
          "price": 150
        },
        "variantId": {
          "color": "Black",
          "size": "10"
        },
        "qty": 1,
        "price": 150
      }
    ]
  },
  "method": "Card",
  "status": "Paid",
  "createdAt": "2025-09-13T10:05:00.000Z"
}
```

### **📊 Analytics Endpoints**

#### **Sales Analytics**
```http
GET /api/admin/analytics/sales?period=month&date_from=2025-01-01&date_to=2025-12-31
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "period": "month",
  "dateRange": {
    "createdAt": {
      "$gte": "2025-01-01T00:00:00.000Z",
      "$lte": "2025-12-31T23:59:59.999Z"
    }
  },
  "overview": {
    "totalRevenue": 125000,
    "totalOrders": 850,
    "averageOrderValue": 147.06
  },
  "salesByStatus": [
    {
      "_id": "Delivered",
      "count": 720,
      "revenue": 108000
    },
    {
      "_id": "Shipped",
      "count": 85,
      "revenue": 12750
    },
    {
      "_id": "Approved",
      "count": 45,
      "revenue": 6750
    }
  ],
  "salesByPayment": [
    {
      "_id": "Card",
      "count": 520,
      "revenue": 78000
    },
    {
      "_id": "UPI",
      "count": 280,
      "revenue": 42000
    },
    {
      "_id": "COD",
      "count": 50,
      "revenue": 7500
    }
  ],
  "dailySales": [
    {
      "_id": {
        "year": 2025,
        "month": 9,
        "day": 13
      },
      "revenue": 4500,
      "orders": 30
    }
  ],
  "topProducts": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "totalSold": 125,
      "totalRevenue": 18750,
      "product": {
        "_id": "507f1f77bcf86cd799439014",
        "title": "Nike Air Max 270",
        "images": ["image1.jpg"],
        "price": 150
      }
    }
  ]
}
```

#### **Inventory Analytics**
```http
GET /api/admin/analytics/inventory
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "overview": {
    "totalValue": 450000,
    "totalItems": 3000,
    "totalVariants": 850
  },
  "lowStock": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "productId": {
        "_id": "507f1f77bcf86cd799439014",
        "title": "Nike Air Max 270",
        "images": ["image1.jpg"]
      },
      "color": "Black",
      "size": "10",
      "stock": 3
    }
  ],
  "outOfStock": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "productId": {
        "_id": "507f1f77bcf86cd799439014",
        "title": "Nike Air Max 270",
        "images": ["image1.jpg"]
      },
      "color": "White",
      "size": "12",
      "stock": 0
    }
  ],
  "inventoryByCategory": [
    {
      "_id": "sneakers",
      "totalStock": 1200,
      "totalValue": 180000,
      "variantCount": 320
    },
    {
      "_id": "boots",
      "totalStock": 800,
      "totalValue": 160000,
      "variantCount": 250
    }
  ],
  "topStock": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "productId": {
        "_id": "507f1f77bcf86cd799439018",
        "title": "Adidas Ultraboost 22",
        "images": ["image1.jpg"],
        "price": 180
      },
      "color": "White",
      "size": "9",
      "stock": 95
    }
  ]
}
```

#### **Customer Analytics**
```http
GET /api/admin/analytics/customers?period=month
Authorization: Bearer ADMIN_ACCESS_TOKEN

Response: 200 OK
{
  "period": "month",
  "overview": {
    "totalCustomers": 1250,
    "verifiedCustomers": 1180,
    "blockedCustomers": 5
  },
  "newCustomersInPeriod": 85,
  "topCustomers": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "totalSpent": 2250,
      "totalOrders": 15,
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

## 🔐 **Authentication & Security Deep Dive**

### **JWT Token System**

#### **How Token Authentication Works:**

1. **User logs in** → Receives access token (15min) + refresh token (30 days)
2. **Access token expires** → Frontend automatically uses refresh token to get new tokens
3. **Refresh token rotation** → Both tokens are replaced on each refresh for security
4. **User continues browsing** → Seamless experience for 30 days without re-login

#### **Token Structure:**
```javascript
// Access Token (15 minutes)
{
  "sub": "user_id",           // User identifier
  "exp": 1694649300          // Expiration timestamp
}

// Refresh Token (30 days)
{
  "sub": "user_id",           // User identifier
  "rvs": 1,                  // Refresh token version
  "jti": "unique-token-id",  // Unique token identifier
  "exp": 1697241300          // Expiration timestamp
}
```

#### **Security Features:**
- **Token Rotation**: Old refresh tokens become invalid after use
- **Breach Detection**: System detects token reuse and revokes all sessions
- **Version Control**: Can invalidate all user tokens by incrementing version
- **Database Tracking**: Refresh tokens are tracked in database with revocation status

### **OTP System**

#### **OTP Types:**
- **VERIFICATION**: Email verification during registration
- **RESET_PASSWORD**: Password reset verification
- **UNBLOCK_LOGIN**: Account unblocking after failed login attempts
- **PAYMENT_CONFIRM**: Payment confirmation for transactions

#### **OTP Security:**
- **Expiration**: 5-10 minutes depending on type
- **Cooldown**: 2-minute resend protection
- **Auto-cleanup**: TTL indexes automatically remove expired OTPs
- **Single-use**: OTPs are deleted immediately after successful verification

### **Password Security**
- **bcrypt hashing**: 12 salt rounds for password protection
- **Failed login protection**: Account locks after 5 failed attempts
- **Account unblocking**: OTP-based unblocking system
- **Password reset**: Secure OTP-based password reset flow

## 🚀 **Production Deployment**

### **Environment Setup**

For production deployment, you'll need to set up the following services:

#### **Database Setup:**
- Use a cloud MongoDB service (MongoDB Atlas recommended)
- Ensure proper network security and access controls
- Set up database indexes for optimal performance

#### **Email Service:**
- Configure SMTP service for sending OTPs and notifications
- Use app-specific passwords for Gmail
- Consider using dedicated email services for production

#### **Security Configuration:**
```bash
# Generate strong secrets for production
NODE_ENV=production
JWT_ACCESS_SECRET=generate_64_character_random_string
JWT_REFRESH_SECRET=generate_different_64_character_random_string
```

### **Deployment Platforms**

This application can be deployed on various platforms:
- **Render** - Easy deployment with auto-scaling
- **Railway** - Simple setup with database integration
- **Heroku** - Traditional PaaS deployment
- **DigitalOcean** - VPS deployment with more control
- **AWS/GCP/Azure** - Enterprise cloud solutions

### **Production Security Checklist:**
- [ ] Strong JWT secrets generated securely
- [ ] Database connection secured with cloud provider
- [ ] All environment variables properly configured
- [ ] `.env` file never committed to repository
- [ ] Email service configured with app passwords
- [ ] SSL certificate enabled (usually automatic with hosting platforms)
- [ ] Rate limiting configured for API endpoints

## 🏢 **Business Logic & Workflows**

### **User Registration Flow:**
1. User submits registration form
2. System creates unverified user account (auto-deletes in 10 minutes)
3. OTP sent to email address
4. User verifies OTP within 5 minutes
5. Account marked as verified and auto-delete removed
6. User can now login and access full features

### **Order Lifecycle:**
```
PaymentPending → Paid → Approved → Shipped → Delivered
     ↓
  Cancelled (allowed until Approved status)
```

#### **Status Transitions:**
- **PaymentPending**: Initial status for online payments, COD orders start as Approved
- **Paid**: Payment confirmed via OTP verification
- **Approved**: Admin approves order for processing
- **Shipped**: Admin marks order as shipped with tracking info
- **Delivered**: Admin confirms delivery completion
- **Cancelled**: User or admin cancels order (restores inventory)

### **Inventory Management:**
- **Atomic Stock Updates**: Prevents overselling with database transactions
- **Real-time Availability**: Stock checked during cart operations
- **Automatic Restoration**: Stock restored when orders are cancelled
- **Variant-based Tracking**: Individual stock levels for each color/size combination

### **Payment Processing:**
- **Multiple Methods**: COD (immediate approval), Card, UPI (require payment confirmation)
- **OTP Verification**: Additional security layer for online payments
- **Transaction Tracking**: Complete audit trail for all payment attempts
- **Automatic Cleanup**: Failed payments restore inventory automatically

## 🛠️ **Development Guidelines**

### **Code Structure:**
```
src/
├── config.js           # Environment configuration
├── index.js            # Application entry point
├── middleware/
│   └── auth.js         # JWT authentication middleware
├── models/             # MongoDB schemas
│   ├── User.js
│   ├── Product.js
│   ├── Variant.js
│   ├── Order.js
│   ├── Cart.js
│   ├── Wishlist.js
│   ├── Transaction.js
│   ├── Otp.js
│   └── RefreshToken.js
├── routes/             # API endpoints
│   ├── auth.js         # Authentication routes
│   ├── users.js        # User management
│   ├── products.js     # Product catalog
│   ├── cart.js         # Shopping cart
│   ├── wishlist.js     # Wishlist management
│   ├── orders.js       # Order processing
│   └── admin.js        # Admin dashboard
└── utils/
    └── mailer.js       # Email utilities
```

### **Database Indexes:**
- **User.email**: Unique index for fast user lookup
- **Product.title + description**: Text index for search functionality
- **Product.categories**: Index for category filtering
- **Order.userId + createdAt**: Compound index for user order history
- **RefreshToken.jti**: Unique index for token lookup
- **TTL Indexes**: Automatic cleanup of expired documents

### **Error Handling:**
- **Consistent Error Format**: Standardized error responses across all endpoints
- **Validation**: Comprehensive input validation with meaningful error messages
- **Logging**: Detailed error logging for debugging and monitoring
- **User-Friendly Messages**: Clear guidance for users on how to resolve issues

### **Performance Optimizations:**
- **Pagination**: All listing endpoints support pagination to handle large datasets
- **Population**: Efficient data loading with selective field population
- **Indexing**: Strategic database indexes for fast query performance
- **Lean Queries**: Use lean() for read-only operations to improve performance

## 📊 **API Response Standards**

### **Success Responses:**
```javascript
// Single item
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com"
}

// List with pagination
{
  "orders": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalOrders": 45,
    "limit": 10,
    "hasNext": true,
    "hasPrev": false
  }
}

// Simple confirmation
{
  "ok": true,
  "message": "Operation completed successfully"
}
```

### **Error Responses:**
```javascript
// Validation error
{
  "error": "Missing required fields",
  "details": ["name is required", "email is required"]
}

// Authentication error
{
  "error": "Invalid token",
  "message": {
    "type": "authentication_failed",
    "title": "Session Expired",
    "description": "Your session has expired. Please login again.",
    "actions": ["Login with credentials", "Contact support"]
  }
}

// Business logic error
{
  "error": "Insufficient stock",
  "availableStock": 3,
  "requestedQuantity": 5
}
```

## 🎯 **Use Case Examples**

### **Frontend Integration:**
```javascript
// React/JavaScript example
class ApiClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async authenticatedFetch(endpoint, options = {}) {
    let response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Handle token refresh automatically
    if (response.status === 401) {
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    return response;
  }

  async refreshTokens() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken })
      });

      if (response.ok) {
        const { access, refresh } = await response.json();
        this.accessToken = access;
        this.refreshToken = refresh;
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        return true;
      }
    } catch (error) {
      this.logout();
    }
    return false;
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}

// Usage examples
const api = new ApiClient();

// Get user orders with filters
const orders = await api.authenticatedFetch('/users/123/orders?status=Delivered&page=1&limit=10');

// Add item to cart
const cartResponse = await api.authenticatedFetch('/cart/add', {
  method: 'POST',
  body: JSON.stringify({
    userId: '123',
    variantId: 'variant456',
    qty: 2
  })
});

// Search products
const products = await fetch(`${api.baseURL}/products?q=nike&category=sneakers`);
```

### **Mobile App Integration:**
```javascript
// React Native / Flutter example
class MobileApiClient {
  constructor() {
    this.baseURL = process.env.REACT_NATIVE_API_URL || 'http://localhost:4000/api';
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const { access, refresh } = await response.json();
      await this.storeTokens(access, refresh);
      return true;
    }
    return false;
  }

  async storeTokens(access, refresh) {
    // Use secure storage for mobile apps
    await SecureStore.setItemAsync('accessToken', access);
    await SecureStore.setItemAsync('refreshToken', refresh);
  }

  async getStoredTokens() {
    const access = await SecureStore.getItemAsync('accessToken');
    const refresh = await SecureStore.getItemAsync('refreshToken');
    return { access, refresh };
  }
}
```

## 🌟 **Advanced Features**

### **Real-time Notifications:**
```javascript
// WebSocket integration for real-time updates
const WebSocket = require('ws');

// Order status updates
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  ws.on('message', (message) => {
    const { userId, action } = JSON.parse(message);
    
    if (action === 'subscribe_orders') {
      ws.userId = userId;
    }
  });
});

// Broadcast order updates to connected users
function broadcastOrderUpdate(userId, orderUpdate) {
  wss.clients.forEach(client => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'order_update',
        data: orderUpdate
      }));
    }
  });
}
```

### **Caching Strategy:**
```javascript
// Redis caching for improved performance
const redis = require('redis');
const client = redis.createClient();

// Cache product catalog
async function getCachedProducts(category) {
  const cached = await client.get(`products:${category}`);
  if (cached) return JSON.parse(cached);
  
  const products = await Product.find({ categories: category });
  await client.setex(`products:${category}`, 3600, JSON.stringify(products));
  return products;
}

// Cache user sessions
async function cacheUserSession(userId, userData) {
  await client.setex(`user:${userId}`, 900, JSON.stringify(userData));
}
```

### **Rate Limiting:**
```javascript
// API rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);
```

## 📈 **Monitoring & Analytics**

### **Performance Metrics:**
- **Response Time**: Track API response times
- **Error Rates**: Monitor 4xx and 5xx responses
- **Database Performance**: Query execution times
- **Memory Usage**: Node.js memory consumption
- **User Activity**: Registration, login, order patterns

### **Business Metrics:**
- **Conversion Rates**: Cart to order conversion
- **Customer Lifetime Value**: Total customer spending
- **Product Performance**: Best sellers, low performers
- **Inventory Turnover**: Stock movement analysis
- **Revenue Growth**: Daily, weekly, monthly trends

### **Health Monitoring:**
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await mongoose.connection.db.admin().ping();
    
    // Check email service
    const emailHealthy = await testEmailConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        email: emailHealthy ? 'connected' : 'error'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## 🤝 **Contributing**

### **Development Setup:**
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/shoestopper-backend.git`
3. Navigate to backend: `cd shoestopper-backend/backend`
4. Install dependencies: `npm install`
5. Set up environment variables in `.env`
6. Start development server: `npm run dev`

### **Code Standards:**
- Use meaningful variable and function names
- Add comments for complex business logic
- Follow RESTful API conventions
- Include error handling for all async operations
- Write comprehensive API documentation

### **Pull Request Process:**
1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes with proper testing
3. Update documentation if needed
4. Submit pull request with detailed description

## 📞 **Support**

### **Common Issues:**

**Q: Email OTPs not being sent**
A: Check Gmail app password setup and EMAIL_USER configuration

**Q: Database connection failures**
A: Verify MongoDB URI and network connectivity

**Q: Token refresh not working**
A: Ensure both access and refresh tokens are stored and sent correctly

**Q: Orders not being created**
A: Check product variant stock levels and cart contents

### **Getting Help:**
- **Documentation**: This comprehensive README
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

## 📄 **License**

ISC License - Free for personal and commercial use.

---

**ShoeStopper Backend** - Built with ❤️ for the modern e-commerce world. Enterprise-grade security, scalable architecture, and developer-friendly APIs for your shoe retail business.

🚀 **Ready to deploy and scale your shoe business to new heights!**
**To get Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account Settings > Security > App passwords
3. Generate an app password for "Mail"
4. Use this 16-character password in `EMAIL_PASS`

3. Start MongoDB (e.g., locally or MongoDB Atlas)

4. Start server

```powershell
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/resend-otp` - Resend OTP 
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Profile
- `GET /api/users/:userId` - Get user profile
- `POST /api/users/:userId/addresses` - Add address
- `PUT /api/users/:userId/addresses/:addressId` - Update address
- `DELETE /api/users/:userId/addresses/:addressId` - Delete address
- `POST /api/users/:userId/addresses/:addressId/default` - Set default address
- `GET /api/users/:userId/orders` - Get order history

### Products
- `GET /api/products` - List products (with filters: category, color, size, q)
- `GET /api/products/:id` - Get product details with variants

### Cart & Wishlist
- `GET /api/cart?userId=` - Get cart
- `POST /api/cart/add` - Add to cart
- `POST /api/cart/remove` - Remove from cart
- `GET /api/wishlist?userId=` - Get wishlist
- `POST /api/wishlist/add` - Add to wishlist
- `POST /api/wishlist/remove` - Remove from wishlist

### Orders
- `POST /api/orders/create` - Create order from cart
- `POST /api/orders/pay/initiate` - Initiate payment (Card/UPI)
- `POST /api/orders/pay/confirm` - Confirm payment with OTP
- `GET /api/orders/:orderId` - Get order details
- `POST /api/orders/:orderId/cancel` - Cancel order

### Admin
- `POST /api/admin/product` - Create product
- `POST /api/admin/variant` - Create variant

### Newsletter ✨ *NEW*
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `GET /api/newsletter/unsubscribe/:token` - Unsubscribe from newsletter
- `GET /api/newsletter/subscribers` - Get all subscribers (Admin only)
- `POST /api/admin/order/:orderId/status` - Update order status
- `PUT /api/admin/variant/:variantId/stock` - Update stock
- `GET /api/admin/orders` - List all orders

Notes:
- OTP cooldowns and expiries are managed via MongoDB TTL indexes
- For production, secure all secrets and use proper authentication middleware
- Email templates can be enhanced with HTML for better UX
