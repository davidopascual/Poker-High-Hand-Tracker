# Poker High Hand Tracker 🃏

A modern, AI-powered poker high hand tracking application that helps poker rooms and home games track qualifying hands for promotions and tournaments.

**🤖 Built with Claude Code** - This project was created with [Claude Code](https://claude.ai/code) as part of the Claude Campus Ambassador program, showcasing how AI can rapidly build functional, real-world applications.

## Features

- 🎯 **Smart Hand Recognition** - AI-powered hand parsing with Gemini API
- ⏱️ **Flexible Timer System** - Customizable tracking periods (5-60 minutes)  
- 🃏 **Visual Card Display** - Beautiful card representations for all hands
- 📊 **Real-time Rankings** - Automatic hand strength comparison
- 📝 **Session History** - Complete tracking with timestamps and amounts
- 🎨 **Modern UI** - Clean, responsive design with glass-morphism effects

## Tech Stack

- React 18 with TypeScript
- Vite for fast development
- Google Gemini AI API
- Modern CSS with custom properties
- Responsive design

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidopascual/poker-high-hand-tracker.git
   cd poker-high-hand-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional)**
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:5173`

### 🔧 Optional: AI Hand Recognition

For enhanced hand parsing capabilities, add a Gemini API key:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enter your API key in the app's settings panel
3. Now you can use natural language like "queen high flush" or "pocket aces"

**Note**: The app works perfectly without an API key using built-in fallback parsing!

## 🎯 How to Use

1. **Set your timer** - Choose tracking period (5-60 minutes)
2. **Add hands** - Type hands like "royal flush hearts" or "full house kings over queens"
3. **Track automatically** - Best qualifying hand is highlighted in real-time  
4. **View history** - See all tracked hands with timestamps and amounts
5. **Demo mode** - Use the demo button to see sample hands in action

Perfect for poker rooms, home games, and tournaments to track high hand promotions with precision and style.

## 🤝 Contributing

This project demonstrates the power of AI-assisted development through Claude Code. Feel free to fork, improve, and share your enhancements!

## 📄 License

MIT License - Feel free to use this project for your poker games and promotions.

---

*Created with ❤️ using [Claude Code](https://claude.ai/code) - Empowering developers with AI-powered coding assistance.*