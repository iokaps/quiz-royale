import { kmClient } from '@/services/km-client';

export interface Question {
	id: string;
	text: string;
	options: {
		A: string;
		B: string;
		C: string;
		D: string;
	};
	correctAnswer: 'A' | 'B' | 'C' | 'D';
	difficulty: number;
}

export interface PlayerData {
	name: string;
	isEliminated: boolean;
	eliminatedAtQuestion: number;
	answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
	answerTimestamps: Record<number, number>; // question number -> timestamp when answered
	hasAnswered: boolean;
}

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;

	// Game phases: 'lobby' | 'question' | 'reveal' | 'transition' | 'finished'
	gamePhase: 'lobby' | 'question' | 'reveal' | 'transition' | 'finished';

	// Pre-generated questions
	questions: Question[];
	isGeneratingQuestions: boolean;

	// Current question data
	currentQuestion: Question | null;
	questionNumber: number;
	questionStartTime: number;

	// Player data and elimination tracking
	players: Record<string, PlayerData>;
	eliminatedPlayers: string[]; // Array of clientIds in elimination order (sorted lexicographically for consistent tie-breaking)
	winner: string; // clientId of the winner

	// Question generation state (deprecated - keeping for compatibility)
	isGeneratingQuestion: boolean;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	gamePhase: 'lobby',
	questions: [],
	isGeneratingQuestions: false,
	currentQuestion: null,
	questionNumber: 0,
	questionStartTime: 0,
	players: {},
	eliminatedPlayers: [],
	winner: '',
	isGeneratingQuestion: false
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
