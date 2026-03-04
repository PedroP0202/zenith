# Zenith Weather App

A premium weather application for runners with intelligent scoring, ultra-fluid loading experiences, and iOS deployment capabilities. Built with Next.js 15, TypeScript, and Capacitor.

## ✨ Features

### 🌟 Premium User Experience
- **Instagram-style Pull-to-Refresh**: Sophisticated touch handling with bounce effects and damping
- **Netflix-style Progressive Loading**: Staggered content appearance with shimmer skeleton states
- **Advanced Animations**: Micro-interactions, haptic feedback, and smooth 60fps transitions
- **Dynamic Backgrounds**: Color-coded weather conditions with gradient transitions

### 🏃‍♂️ Runner Intelligence
- **Smart Weather Scoring**: Algorithm-based analysis of temperature, wind, air quality, and UV index
- **AI-Generated Tips**: Dynamic, personalized running recommendations powered by OpenAI GPT
- **Change Detection**: New tips generated when weather conditions change significantly
- **Real-time Data**: Live weather updates with GPS integration

### 📱 Mobile-First Design
- **iOS Deployment**: Capacitor 7 integration for native iOS app
- **Responsive UI**: Optimized for mobile devices with touch interactions
- **Performance Optimized**: Smooth scrolling, passive touch listeners, and efficient rendering

### 🧭 **Bottom Navigation**
- **Weather Tab**: Main weather dashboard with AI-powered tips
- **Streaks Tab**: Track running streaks, achievements, and personal records
- **Activities Tab**: Complete activity history with detailed stats
- **Start Run Tab**: Modern run tracking interface with live metrics

## 📱 **App Features**

### 🌤️ **Weather Dashboard**
- Real-time weather data with GPS integration
- Intelligent scoring based on running conditions
- AI-generated personalized tips that update with weather changes
- Progressive loading animations and pull-to-refresh

### 🔥 **Streaks & Achievements**
- Track consecutive running days
- Weekly progress monitoring
- Achievement system with unlockable badges
- Personal best records and motivational messages

### 📊 **Activities History**
- Complete running activity log
- Detailed stats: distance, pace, duration, calories
- Monthly summaries and trends
- Location tracking for each run

### 🏃‍♂️ **Run Tracking**
- Multiple workout types (easy run, tempo, intervals, long run)
- Live tracking with GPS (simulated in demo)
- Real-time metrics: pace, distance, heart rate, calories
- Modern control interface with pause/play/stop

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Xcode (for iOS deployment)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Copy `.env.example` to `.env.local` and fill in your API keys:
```bash
cp .env.example .env.local
```
Then edit `.env.local` with your actual API keys.

4. **Run development server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

### iOS Deployment

1. **Add iOS platform:**
```bash
npx cap add ios
```

2. **Build and sync:**
```bash
npm run build
npx cap sync ios
```

3. **Open in Xcode:**
```bash
npx cap open ios
```

## 🏗️ Project Structure

```
├── app/
│   ├── page.tsx              # Main interface with progressive loading
│   ├── globals.css           # Premium animations and styles
│   └── layout.tsx            # App layout
├── services/
│   └── weather.ts            # OpenWeatherMap API integration
├── utils/
│   └── scoring.ts            # Intelligent weather analysis
├── capacitor.config.ts       # Mobile deployment configuration
└── components/
    └── WeatherCard.tsx       # Weather metrics component
```

## 🎨 Technical Highlights

### Progressive Loading System
- Staggered content appearance (150ms intervals)
- Shimmer skeleton states during loading
- Conditional rendering based on load state
- Haptic feedback for each loading stage

### Pull-to-Refresh Mechanism
- Instagram-inspired bounce effects
- Damping algorithm for natural feel
- Visual progress indicators
- Optimized touch event handling

### Performance Optimizations
- Passive touch listeners
- Efficient re-renders with React hooks
- Background process management
- Smooth scrolling enabled

## 🤖 AI-Powered Tips System

The app features an intelligent tip generation system that creates personalized running advice:

### How It Works
1. **Weather Monitoring**: Tracks current weather conditions (temperature, wind, air quality, UV)
2. **Change Detection**: Compares current conditions with previously stored data
3. **Significant Change Check**: Triggers AI generation when:
   - Temperature changes by 5°C or more
   - Wind speed changes by 10 km/h or more  
   - Air quality changes by 2+ points
4. **AI Generation**: Uses OpenAI GPT-3.5-turbo to create contextual, personalized tips
5. **Fallback System**: Uses algorithmic tips if OpenAI API is unavailable

### AI Tip Examples
- *"Com calor de 32°C, começa devagar nos primeiros 10 minutos para aclimatar"*  
- *"Vento lateral de 25km/h pode desequilibrar tua passada, mantém core forte"*
- *"AQI 4 indica poluição elevada, considera máscara ou treino indoor alternativo"*

### AI Tips Configuration
- **API**: OpenAI GPT-3.5-turbo
- **Cost**: ~$0.002 per request (very low cost for occasional use)
- **Fallback**: Automatic fallback to basic tips if API unavailable
- **Privacy**: Weather data sent to OpenAI for tip generation only

*Tip: The AI generates new tips only when weather conditions change significantly, minimizing API calls.*