# MHEMA Express Logistics Platform

A comprehensive logistics and order management system designed to efficiently distribute orders among agents, manage payments, and provide insightful analytics.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Features

### Core Capabilities
- **Intelligent Order Distribution** - Round-robin algorithm with agent availability tracking
- **Multi-Role Support** - Admin, Agent, and Customer dashboards
- **QR Code Payments** - M-Pesa, Tigo Pesa, and Selcom integration without APIs
- **Real-Time Tracking** - Order status updates and notifications
- **Analytics Dashboard** - Interactive charts with Recharts
- **Multi-Transport** - Support for Bolt, buses, cargo, and custom methods
- **Bilingual Support** - English and Swahili (i18n)

### For Admins
✅ Full system oversight and control  
✅ Agent management (add, update, activate/deactivate)  
✅ Payment QR code management  
✅ Order reassignment and override capabilities  
✅ Comprehensive analytics and reporting  
✅ Transport method configuration  

### For Agents
✅ Order assignment and management  
✅ Real-time status updates  
✅ Payment confirmation workflow  
✅ Personal performance metrics  
✅ Availability status control  

### For Customers
✅ Easy order placement  
✅ Multiple transport options  
✅ QR code payment access  
✅ Real-time order tracking  
✅ Order history  

## 📚 Documentation

- **[System Architecture](SYSTEM_ARCHITECTURE.md)** - Complete system overview, workflows, and architecture
- **[Technical Implementation](TECHNICAL_IMPLEMENTATION.md)** - Database schema, API endpoints, and component architecture
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Setup instructions, development workflow, and best practices

## 🛠️ Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** - Fast build tooling
- **Tailwind CSS** - Utility-first styling
- **shadcn-ui** - Modern component library
- **React Query** (@tanstack/react-query) - Server state management
- **Recharts** - Data visualization
- **Leaflet** - Interactive maps
- **i18next** - Internationalization

### Key Libraries
- React Router - Navigation
- React Hook Form - Form handling
- Lucide React - Icons
- Zod - Schema validation

## 🚦 Getting Started

### Prerequisites
- Node.js v18.0.0 or higher
- npm or bun package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mhema-connect-ship-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_APP_NAME=MHEMA Express Logistics
   VITE_ENABLE_NOTIFICATIONS=true
   VITE_ENABLE_ANALYTICS=true
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
mhema-connect-ship-main/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # shadcn-ui components
│   │   ├── layout/      # Layout components
│   │   ├── orders/      # Order components
│   │   ├── agents/      # Agent components
│   │   └── analytics/   # Chart components
│   ├── pages/           # Page components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   └── locales/         # i18n translations
├── public/              # Static assets
├── SYSTEM_ARCHITECTURE.md
├── TECHNICAL_IMPLEMENTATION.md
└── DEVELOPER_GUIDE.md
```

## 🔑 Key Concepts

### Order Distribution
The system uses a **round-robin algorithm** to fairly distribute orders among available agents. When all agents are offline, orders are queued and automatically assigned when agents come online.

### Payment System
Instead of complex API integrations, the system uses **QR code-based payments**. Admins upload payment QR codes (M-Pesa, Tigo Pesa, Selcom), customers scan and pay, and agents manually confirm payments.

### Role-Based Access
Three distinct user roles with appropriate permissions:
- **Admin** - Full system control
- **Agent** - Operational tasks
- **Customer** - Order placement and tracking

## 📊 Analytics Features

- Daily and monthly sales charts
- Agent performance comparison
- Revenue trends analysis
- Transport method usage statistics
- Real-time dashboard updates
- Exportable reports (PDF, Excel)

## 🌍 Internationalization

The platform supports multiple languages:
- **English** (en)
- **Swahili** (sw)

All UI text is translatable through the i18n system.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for detailed development guidelines.

## 📝 License

This project is licensed under the MIT License.

## 📧 Support

For questions or support:
- Check the documentation
- Create an issue on GitHub
- Contact the development team

## 🎯 Roadmap

- [ ] Real-time GPS order tracking
- [ ] Mobile app for agents (React Native)
- [ ] SMS notifications integration
- [ ] Direct payment API integration (optional)
- [ ] Customer rating system
- [ ] Multi-warehouse support
- [ ] Route optimization algorithm
- [ ] Predictive analytics

---

**Built with ❤️ for modern logistics operations**

