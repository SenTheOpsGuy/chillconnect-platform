# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Development Server
```bash
npm run dev          # Start development server with Turbopack
```

### Build & Production
```bash
npm run build        # Build for production with Turbopack
npm start           # Start production server
```

### Code Quality
```bash
npm run lint        # Run ESLint
```

### Database Operations
```bash
npx prisma generate              # Generate Prisma client after schema changes
npx prisma db push              # Push schema changes to development database
npx prisma db seed              # Run database seed scripts
npx prisma migrate dev          # Create and apply new migrations
npx prisma studio               # Open Prisma Studio database browser
```

### Testing Specific Components
To test individual pages/components during development, navigate to:
- Landing page: `http://localhost:3000/`
- Authentication: `http://localhost:3000/login` or `http://localhost:3000/register`
- Dashboard (role-specific): `http://localhost:3000/dashboard`

## Architecture Overview

### Project Structure
ChillConnect is a **Next.js 15** consultation platform with **TypeScript** and **App Router**. The application follows a multi-tenant architecture supporting four user roles: SEEKER (clients), PROVIDER (consultants), EMPLOYEE (staff), and SUPER_ADMIN.

### Core Architecture Components

**Database Layer (PostgreSQL + Prisma)**
- `prisma/schema.prisma` - Complete data model with sophisticated relationships
- Multi-role user system with wallet functionality, booking management, and real-time messaging
- Advanced booking states (PENDING, CONFIRMED, COMPLETED, CANCELLED, DISPUTED)

**Authentication & Authorization**
- NextAuth.js integration with custom authentication logic in `src/lib/auth.ts`
- Role-based middleware protection in `middleware.ts` 
- Route protection enforces role-specific access (e.g., `/dashboard/provider` only for PROVIDERs)

**Payment Processing**
- Dual payment system: Stripe (primary) + PayPal integration
- `src/lib/payments/stripe.ts` handles connected accounts, payment intents, refunds, and provider payouts
- Wallet system for handling escrow and provider earnings

**Communication Systems**
- Real-time messaging via Pusher WebSockets (see `pusher` dependencies)
- Google Meet integration for video consultations (`src/lib/meeting/google-meet.ts`)
- Multi-channel notifications: Email (Brevo), SMS (Twilio)

**Multi-Role Dashboard Architecture**
- Role-based navigation and UI in `src/app/dashboard/layout.tsx`
- Each role has distinct workflows and permissions
- SEEKER: booking management, expert search
- PROVIDER: availability management, earnings tracking  
- EMPLOYEE: handles unmatched requests, verifications
- SUPER_ADMIN: full system analytics and user management

### Key Integration Points

**External Services**
- Google Calendar/Meet API for video conferencing
- Stripe Connect for marketplace payments
- Upstash Redis for caching and rate limiting
- Vercel Postgres for production database

**Development vs Production**
The codebase includes mock implementations for development (see Google Meet mock in `src/lib/meeting/google-meet.ts`) and switches to real integrations in production based on environment variables.

### Environment Dependencies
Key environment variables required:
- Database: `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Data Flow Architecture
1. **Booking Flow**: User searches → booking creation → payment processing → calendar integration → session management
2. **Authentication Flow**: Login/register → role-based dashboard redirect → permission-based feature access
3. **Communication Flow**: In-app messaging → email/SMS notifications → video meeting coordination

This is a sophisticated marketplace application with complex state management, role-based permissions, and multiple third-party integrations requiring careful environment setup for full functionality.
