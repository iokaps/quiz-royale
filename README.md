# Quiz Royale 🏆

A massive trivia elimination game where 20-100 players compete simultaneously. Players answer multiple-choice questions within a time limit, and incorrect answers or timeouts result in elimination. The last player standing wins!

## 🎮 Game Features

- **Massive Multiplayer**: Support for 20-100 concurrent players
- **AI-Generated Questions**: Progressive difficulty trivia questions powered by AI
- **Real-time Elimination**: Players eliminated instantly for wrong answers or timeouts
- **Live Tracking**: Host and presenter modes with real-time game status
- **Mobile-First**: Optimized for mobile player experience
- **Multiple Display Modes**: Host control, player interface, and presenter display

## 🎯 How to Play

### For Players

1. Join using the QR code or player link
2. Enter your name to join the lobby
3. Wait for the host to start the game
4. Answer multiple-choice questions within 10 seconds
5. Get eliminated for wrong answers or timeout
6. Last player standing wins!

### For Hosts

- Share the player link/QR code with participants
- Monitor player connections and game status
- Start the game when ready
- Control question flow and see live eliminations
- Declare the winner when only one player remains

### For Presenters

- Large screen display for audiences
- Show current questions and answer options
- Display player count and elimination stats
- Countdown timers and answer reveals
- Winner announcements with celebrations

## 🚀 Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run development server**

   ```bash
   npm run dev
   ```

3. **Open your browser**
   - Navigate to [http://localhost:5173](http://localhost:5173)
   - This opens the host interface

4. **Get player links**
   - Copy the player link from the host interface
   - Share with participants via QR code or direct link

5. **Start playing**
   - Players join and enter their names
   - Host starts the game when ready
   - AI generates progressive difficulty questions
   - Players compete until one winner remains!

## 🎲 Game Flow

1. **Lobby Phase**: Players join and wait for host to start
2. **Question Phase**: AI generates trivia questions with 4 multiple-choice answers
3. **Answer Phase**: Players have 10 seconds to select their answer
4. **Elimination Phase**: Wrong answers or timeouts eliminate players
5. **Repeat**: Questions get progressively harder until one winner remains
6. **Victory**: Winner celebration and final statistics

## ⚙️ Configuration

Quiz Royale is highly configurable through `default.config.yaml`:

- **Timing**: Question time limits, reveal duration, transition times
- **AI Settings**: Question generation prompts and difficulty scaling
- **Text/Labels**: All user-facing text for internationalization
- **Game Rules**: Elimination criteria and winner conditions

## 🏗️ Architecture

Built with modern web technologies:

- **Frontend**: React + TypeScript + Tailwind CSS
- **State Management**: Kokimoki SDK with real-time synchronization
- **AI Integration**: Built-in question generation
- **Responsive Design**: Mobile-first player interface
- **Real-time**: WebSocket-based live updates

## 📱 Display Modes

### Host Mode (`/host`)

- Game control dashboard
- Player management and status
- Question flow controls
- Live elimination tracking
- Winner announcements

### Player Mode (`/player`)

- Mobile-optimized interface
- Question display with countdown
- Answer selection buttons
- Elimination and winner screens
- Real-time game updates

### Presenter Mode (`/presenter`)

- Large screen display
- Audience-friendly question presentation
- Live statistics and player counts
- Countdown timers and reveals
- Victory celebrations

## 🎊 Game Features

- **Progressive Difficulty**: Questions start easy and get harder
- **Multiple Categories**: General knowledge, science, history, sports, entertainment
- **Real-time Sync**: All players see questions simultaneously
- **Auto-elimination**: Timeout handling and instant feedback
- **Live Statistics**: Player counts, eliminations, and progress tracking
- **Winner Celebration**: Confetti effects and victory screens

## 🛠️ Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint checks

### Building

Build the concept for production:

```bash
npm run build
```

### Uploading to Kokimoki

To upload your concept to Kokimoki, run:

```bash
kokimoki upload
```

**Important:** Before uploading again, you must update the version in `package.json`. You can do this:

1. Using the npm version command:

   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. Or manually edit the `version` field in `package.json`

Uploading with the same version will fail. Always increment the version before running `kokimoki upload` again.

## Learn More

Visit [kokimoki.com](https://kokimoki.com) for more information and documentation.
