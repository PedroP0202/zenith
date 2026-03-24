# Zenith

A premium, minimalist habit tracker designed for high-performance individuals. Zenith combines sophisticated aesthetics with social gamification and cloud synchronization to help you build lasting discipline.

## ✨ Features

### 🏆 User Profile & Trophy Wall
- **Gamified Achievements**: Unlock 6 unique trophies based on your consistency and social interaction.
- **Dynamic Ranking**: Level up from *Iniciante* to *Mestre Zen* as you accumulate check-ins.
- **Quick Stats**: Track your best streaks, active days, and total completions at a glance.
- **Identity Tags**: Unique `@username` handles for social discovery.

### 🌟 Premium User Experience
- **Minimalist Aesthetic**: Fluid glassmorphism, deep blacks, and refined typography (Inter/Outfit).
- **Physics-Based Navigation**: 3-item bottom bar with Framer Motion transitions and elastic feedback.
- **Haptic Excellence**: Tactile feedback for habit completions and navigation.
- **Micro-Animations**: Staggered loading and progressive content appearance for a "Netflix-style" feel.

### 🤝 Social & Arena
- **Global Leaderboard**: Compete in *A Arena* with users worldwide based on consistency scores.
- **Friend System**: Search and follow friends to stay motivated together.
- **Activity Feed**: Real-time updates on your network's progress (Privacy-first).
- **Beta Feedback**: Integrated feedback loop for rapid iteration.

### ☁️ Zenith Cloud
- **Cross-Device Sync**: Real-time synchronization powered by bit-level Cloudflare Workers backend.
- **Data Security**: Secure vault for your habit history and personal metrics.
- **Export Capabilities**: Complete JSON export of your data for personal backup.

### 📱 Mobile Architecture
- **iOS Optimized**: Built with Capacitor for a native iOS experience.
- **Performance First**: Smooth 60fps animations, passive listeners, and efficient state management with Zustand.
- **Smart Reminders**: Local notifications for morning planning and daily check-ins.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm
- Xcode (for iOS deployment)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

### iOS Deployment

1. **Build the web project:**
```bash
npm run build
```

2. **Sync with Capacitor:**
```bash
npx cap sync ios
```

3. **Open in Xcode:**
```bash
npx cap open ios
```

## 🏗️ Technical Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Animations**: Framer Motion.
- **State Management**: Zustand (with Persist).
- **Mobile Bridge**: Capacitor.
- **Backend**: Cloudflare Workers (Zenith API).
- **Database**: Cloudflare D1 (SQLite).

## 🎨 Design Philosophy

Zenith is built on the principle of **"The Power of Negative Space."** By removing unnecessary visual noise, the user can focus entirely on their daily habits. Primary actions are contained in floating action buttons (FABs), while secondary technical settings are hidden in accordion-style menus.

---
*Zenith — Mastery through Consistency.*