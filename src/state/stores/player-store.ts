import { kmClient } from '@/services/km-client';

export interface PlayerState {
	name: string;
	currentView: 'lobby' | 'question' | 'eliminated' | 'winner' | 'connections';
	selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
}

const initialState: PlayerState = {
	name: '',
	currentView: 'lobby',
	selectedAnswer: null
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
