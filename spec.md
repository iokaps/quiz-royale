# Quiz Royale - Game Specification

## Overview

Quiz Royale is a massive trivia elimination game where 20-100 players compete simultaneously. Players answer multiple-choice questions within a time limit, and incorrect answers or timeouts result in elimination. The last player standing wins.

## Game Flow

### 1. Lobby Phase

- Players join using a shared link/QR code
- Host can see all connected players
- Players enter their names
- Host starts the game when ready

### 2. Game Phase

- AI generates progressive difficulty questions
- Each question has 4 multiple-choice answers (A, B, C, D)
- Players have 10 seconds to answer
- Incorrect answers or timeouts eliminate players
- Questions get progressively harder
- Game continues until 1 player remains

### 3. Results Phase

- Winner is announced
- Final leaderboard shown
- Option to play again

## Game States

### Global State

- `gamePhase`: 'lobby' | 'question' | 'results' | 'finished'
- `currentQuestion`: Question object with text, options, correct answer
- `questionNumber`: Current question index (1-based)
- `questionStartTime`: Server timestamp when question started
- `players`: Record of all players with scores and elimination status
- `eliminatedPlayers`: Array of eliminated player IDs in order
- `winner`: Winner player ID when game ends

### Player State

- `name`: Player display name
- `currentView`: 'lobby' | 'question' | 'eliminated' | 'winner'
- `selectedAnswer`: Current answer selection ('A' | 'B' | 'C' | 'D' | null)
- `hasAnswered`: Boolean if player submitted answer for current question

## Question Structure

```typescript
interface Question {
  id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  difficulty: number; // 1-10 scale
}
```

## Timing

- **Question Display**: 10 seconds per question
- **Answer Reveal**: 3 seconds to show correct answer and eliminations
- **Question Transition**: 2 seconds between questions

## AI Integration

- Use `kmClient.chat()` to generate trivia questions
- Progressive difficulty: start easy (1-3), increase every 5 questions
- Categories: General knowledge, science, history, sports, entertainment
- Ensure questions are appropriate for all audiences

## UI Modes

### Host Mode

- Player count and connection status
- Game controls (Start/Stop)
- Current question display
- Live elimination tracking
- Winner announcement

### Player Mode

- Lobby: Wait for game start
- Question: Display question with 4 answer buttons
- Countdown timer (10 seconds)
- Elimination screen when eliminated
- Winner celebration screen

### Presenter Mode

- Large screen display for audience
- Current question and options
- Player count and eliminations
- Countdown timer
- Winner announcement

## Technical Requirements

- Support 20-100 concurrent players
- Real-time synchronization using Kokimoki SDK
- Progressive question difficulty
- Elimination tracking
- Winner determination
- Responsive design for mobile players
