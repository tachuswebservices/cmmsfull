# CMMS India - Maintenance Management System

A comprehensive Computerized Maintenance Management System designed for Indian manufacturing and industrial companies.

## 🚀 Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open in Browser**
   \`\`\`
   http://localhost:3000
   \`\`\`

4. **Login Credentials**
   \`\`\`
   Email: admin@company.in
   Password: password123
   \`\`\`

## 📁 Project Structure

\`\`\`
cmms-india/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── dashboard/         # Dashboard components
│   ├── work-orders/       # Work Orders components
│   ├── assets/            # Assets components
│   ├── inventory/         # Inventory components
│   ├── maintenance/       # Maintenance components
│   ├── reports/           # Reports components
│   ├── users/             # Users components
│   ├── settings/          # Settings components
│   └── providers/         # Context providers
├── lib/                   # Utility functions and services
│   ├── services/          # Mock API services
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
└── public/                # Static assets
\`\`\`

## 🛠 Features

- **Dashboard** - Overview of maintenance operations
- **Work Orders** - Create and manage maintenance work orders
- **Asset Management** - Track and manage industrial assets
- **Inventory** - Manage spare parts and supplies
- **Preventive Maintenance** - Schedule recurring maintenance tasks
- **Reports & Analytics** - Generate maintenance reports
- **User Management** - Manage system users and permissions
- **Settings** - Configure system preferences

## Preventive Maintenance: Web vs Native behavior
- Web (admin dashboard):
  - `GET /preventive-tasks` requires `assetId` and returns all tasks for that asset.
  - No geofence is applied.
- Native (operator app):
  - `GET /preventive-tasks/my` returns tasks assigned to the logged-in user. No geofence.
  - `GET /preventive-tasks?mobile=true&assetId=...` enforces geofence and expects `latitude` and `longitude` unless disabled via env.

### Geofence toggle
- Backend env variable `PREVENTIVE_GEOFENCE_ENABLED` (default `true`).
  - Set to `false` to skip location requirement for asset-scoped preventive calls from native.

## 🔧 Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Lucide React** - Beautiful icons
- **Radix UI** - Accessible component primitives

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🌐 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🚀 Deployment

To build for production:

\`\`\`bash
npm run build
npm start
\`\`\`

## 📄 License

This project is licensed under the MIT License.
