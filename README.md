# 🍽️ FOOD7 - AI-Powered Smart Restaurant Management System

Complete AI-powered restaurant management system with call analysis, marketing automation, inventory prediction, smart billing, and comprehensive analytics.

## 🎨 Features

### 🤖 AI-Powered Features

- **Call Analysis**: Speech-to-text transcription using Whisper API + sentiment analysis with Groq
- **Marketing Generator**: AI-generated marketing content for Instagram, SMS, WhatsApp, and more
- **Inventory Prediction**: ML-based demand forecasting and waste reduction
- **Analytics Insights**: Daily sales insights and intelligent recommendations

### 📊 Core Modules

- **Dashboard**: Real-time metrics, alerts, and AI recommendations
- **Smart Billing**: Order management with GST calculation
- **Inventory Management**: Stock tracking with AI predictions
- **Call Analysis**: Customer call transcription and complaint detection
- **Marketing**: AI content generation and campaign management
- **Analytics**: Revenue charts, top items, peak hours analysis

### 🎨 Design

- **Premium Red & Black Theme** (#8B0000, #0B0B0B)
- **Glassmorphism UI** with smooth animations
- **Fully Responsive** (Mobile, Tablet, Desktop)
- **Modern Dashboard** inspired by Zomato/Uber Eats admin panels

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- OpenAI API key (for Whisper)
- Groq API key (for LLM features)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY=your_openai_key
# - GROQ_API_KEY=your_groq_key

# Make sure MongoDB is running locally
# Or update MONGODB_URI in .env for MongoDB Atlas

# Start the server
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
food7/
├── backend/
│   ├── config/          # Database and environment config
│   ├── models/          # MongoDB schemas
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── services/        # AI services (Whisper, Groq, ML)
│   ├── middleware/      # Auth, error handling, file upload
│   ├── uploads/         # Uploaded call recordings
│   └── server.js        # Express server
│
└── frontend/
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── pages/       # Page components
    │   ├── context/     # React context (Auth)
    │   ├── services/    # API service
    │   └── App.jsx      # Main app with routing
    ├── public/
    └── index.html
```

## 🔐 Authentication

The system uses JWT authentication with role-based access control:

### Demo Credentials

**Admin:**

- Email: `admin@food7.com`
- Password: `admin123`
- Access: Full system access

**Manager:**

- Email: `manager@food7.com`
- Password: `manager123`
- Access: Most features except user management

**Staff:**

- Email: `staff@food7.com`
- Password: `staff123`
- Access: Limited to billing and basic operations

### Creating Users

```bash
# Use the register endpoint or create via MongoDB
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@food7.com",
  "password": "password123",
  "role": "admin|manager|staff"
}
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Orders

- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `GET /api/orders/stats/today` - Today's stats

### Inventory

- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Add item
- `GET /api/inventory/predictions/all` - AI predictions
- `GET /api/inventory/alerts/low-stock` - Low stock alerts

### Call Analysis

- `POST /api/calls/upload` - Upload call recording
- `GET /api/calls` - Get all calls
- `GET /api/calls/stats/summary` - Call statistics

### Marketing

- `POST /api/marketing/generate` - Generate AI content
- `POST /api/marketing/save` - Save campaign
- `GET /api/marketing/suggestions` - AI suggestions

### Analytics

- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/top-items` - Top selling items
- `GET /api/analytics/alerts` - All alerts

## 🤖 AI Configuration

### Whisper API (Speech-to-Text)

Used for call transcription. Requires OpenAI API key.

```env
OPENAI_API_KEY=sk-...
```

### Groq API (LLM Features)

Used for sentiment analysis and marketing content generation.

```env
GROQ_API_KEY=gsk_...
```

### Fallback Mode

If API keys are not configured, the system will use mock responses for development.

## 🎨 Theme Customization

The Food7 theme is defined in `frontend/tailwind.config.js`:

```javascript
colors: {
  'food7-red': '#8B0000',      // Primary red
  'food7-black': '#0B0B0B',    // Dark background
  'food7-gold': '#D4AF37',     // Accent gold
  // ... more colors
}
```

## 📱 Responsive Design

The UI is fully responsive with breakpoints:

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Production Deployment

### Backend

```bash
cd backend
npm run build
NODE_ENV=production npm start
```

### Frontend

```bash
cd frontend
npm run build
# Serve the dist/ folder with your preferred static hosting
```

### Environment Variables for Production

- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure MongoDB Atlas for production database
- Set up proper CORS in backend
- Use HTTPS for all connections

## 📊 Database Schema

### Users

- name, email, password (hashed), role, timestamps

### Orders

- orderNumber (auto-generated), items, subtotal, gst, total, paymentMethod, status

### Inventory

- itemName, category, quantity, unit, price, reorderLevel, dailyUsage[], predictedDemand

### Calls

- audioFilePath, transcript, sentiment, isComplaint, suggestedAction, status

### Marketing

- title, content, type, platform, performance metrics, context

### Analytics

- date, revenue, orders, topItems, peakHours, complaints, aiInsights

## 🛠️ Tech Stack

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- OpenAI Whisper API
- Groq SDK
- Multer (file uploads)

### Frontend

- React 18
- Tailwind CSS
- Framer Motion (animations)
- Chart.js (analytics)
- Axios (API calls)
- React Router DOM

## 📝 License

MIT License - Feel free to use for your restaurant!

## 🤝 Support

For issues or questions:

1. Check the API documentation
2. Review the implementation plan
3. Check MongoDB connection
4. Verify API keys are configured

## 🎯 Future Enhancements

- WhatsApp ordering bot
- Voice ordering system
- Face recognition for loyal customers
- Mobile app for owners
- Real-time notifications
- Advanced ML models for predictions

---

**FOOD7** - Making restaurants smarter with AI 🍽️✨
