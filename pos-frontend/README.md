# POS System Frontend

Modern, clean, and professional frontend for the Universal SaaS POS System.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Authentication
- **Axios** - HTTP client
- **Zustand** - State management
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icons

## Features

✅ **Authentication** - Secure login with Supabase
✅ **Dashboard** - Real-time metrics and quick actions
✅ **Items Management** - Create and manage products
✅ **POS System** - Fast billing interface
✅ **KOT Management** - Kitchen order tickets
✅ **Inventory** - Stock levels and batch tracking
✅ **Reports** - Sales and analytics reports
✅ **Users** - User management
✅ **Responsive Design** - Works on all devices

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3001

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
