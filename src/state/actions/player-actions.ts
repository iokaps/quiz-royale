import { kmClient } from '@/services/km-client';
import { globalStore } from '../stores/global-store';
import { playerStore, type PlayerState } from '../stores/player-store';

export const playerActions = {
	async setCurrentView(view: PlayerState['currentView']) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	},

	async setPlayerName(name: string) {
		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				playerState.name = name;
				globalState.players[kmClient.id] = {
					name,
					isEliminated: false,
					eliminatedAtQuestion: 0,
					answers: {},
					hasAnswered: false
				};
			}
		);
	},

	async selectAnswer(answer: 'A' | 'B' | 'C' | 'D') {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.selectedAnswer = answer;
		});
	},

	async submitAnswer(answer: 'A' | 'B' | 'C' | 'D') {
		await kmClient.transact([globalStore], ([globalState]) => {
			const player = globalState.players[kmClient.id];
			if (player && !player.isEliminated && !player.hasAnswered) {
				player.answers[globalState.questionNumber] = answer;
				player.hasAnswered = true;

				// Check if all active players have answered
				const activePlayers = Object.values(globalState.players).filter(
					(p) => !p.isEliminated
				);
				const answeredPlayers = activePlayers.filter((p) => p.hasAnswered);

				console.log(
					`Player answered: ${answeredPlayers.length}/${activePlayers.length} players have answered`
				);

				// If all active players have answered, trigger reveal phase
				if (
					answeredPlayers.length === activePlayers.length &&
					globalState.gamePhase === 'question'
				) {
					console.log(
						'All players have answered, processing eliminations immediately'
					);
					globalState.gamePhase = 'reveal';

					// Process eliminations immediately
					const correctAnswer = globalState.currentQuestion?.correctAnswer;
					if (correctAnswer) {
						let newEliminations: string[] = [];

						Object.entries(globalState.players).forEach(
							([clientId, player]) => {
								if (player.isEliminated) return;

								const playerAnswer = player.answers[globalState.questionNumber];
								const didNotAnswer = !player.hasAnswered;
								const answeredIncorrectly =
									playerAnswer && playerAnswer !== correctAnswer;

								if (didNotAnswer || answeredIncorrectly) {
									console.log(
										`Eliminating player ${clientId} for wrong answer: ${playerAnswer} (correct: ${correctAnswer})`
									);
									player.isEliminated = true;
									player.eliminatedAtQuestion = globalState.questionNumber;
									newEliminations.push(clientId);
								}
							}
						);

						// Sort and add eliminations
						newEliminations.sort();
						globalState.eliminatedPlayers.push(...newEliminations);

						// Check for winner
						const remainingPlayers = Object.entries(globalState.players)
							.filter(([_, player]) => !player.isEliminated)
							.map(([clientId]) => clientId);

						if (remainingPlayers.length === 1) {
							console.log(`Game finished - winner: ${remainingPlayers[0]}`);
							globalState.winner = remainingPlayers[0];
							globalState.gamePhase = 'finished';
						} else if (remainingPlayers.length === 0) {
							console.log(`Game finished - everyone eliminated`);
							globalState.gamePhase = 'finished';
						}
					}
				}
			}
		});
	},

	async clearSelectedAnswer() {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.selectedAnswer = null;
		});
	}
};
