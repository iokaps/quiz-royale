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
					answerTimestamps: {},
					hasAnswered: false
				};
				console.log(
					`PLAYER DEBUG: Player ${kmClient.id} (${name}) joined. Total players: ${Object.keys(globalState.players).length}`
				);
				console.log(
					`PLAYER DEBUG: Current players:`,
					Object.entries(globalState.players).map(
						([id, p]) => `${id}: ${p.name}`
					)
				);
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
				player.answerTimestamps[globalState.questionNumber] =
					kmClient.serverTimestamp();
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
					console.log(
						`ELIMINATION DEBUG: Processing eliminations for question ${globalState.questionNumber}, correct answer: ${correctAnswer}`
					);

					if (correctAnswer) {
						let newEliminations: string[] = [];

						Object.entries(globalState.players).forEach(
							([clientId, player]) => {
								console.log(
									`ELIMINATION DEBUG: Checking player ${clientId}, isEliminated: ${player.isEliminated}`
								);
								if (player.isEliminated) return;

								const playerAnswer = player.answers[globalState.questionNumber];
								const didNotAnswer = !player.hasAnswered;
								const answeredIncorrectly =
									playerAnswer && playerAnswer !== correctAnswer;

								console.log(
									`ELIMINATION DEBUG: Player ${clientId} - answer: ${playerAnswer}, hasAnswered: ${player.hasAnswered}, didNotAnswer: ${didNotAnswer}, answeredIncorrectly: ${answeredIncorrectly}`
								);

								if (didNotAnswer || answeredIncorrectly) {
									console.log(
										`ELIMINATION DEBUG: Eliminating player ${clientId} for wrong answer: ${playerAnswer} (correct: ${correctAnswer})`
									);
									player.isEliminated = true;
									player.eliminatedAtQuestion = globalState.questionNumber;
									newEliminations.push(clientId);
								} else {
									console.log(
										`ELIMINATION DEBUG: Player ${clientId} survives with correct answer: ${playerAnswer}`
									);
								}
							}
						);

						// Sort and add eliminations
						newEliminations.sort();
						globalState.eliminatedPlayers.push(...newEliminations);
						console.log(
							`ELIMINATION DEBUG: Total eliminations this round: ${newEliminations.length}, eliminated players: ${newEliminations}`
						);

						// Check for winner
						const remainingPlayers = Object.entries(globalState.players)
							.filter(([_, player]) => !player.isEliminated)
							.map(([clientId]) => clientId);

						console.log(
							`ELIMINATION DEBUG: Remaining players: ${remainingPlayers.length}, players: ${remainingPlayers}`
						);

						if (remainingPlayers.length === 1) {
							console.log(
								`ELIMINATION DEBUG: Game finished - winner: ${remainingPlayers[0]}`
							);
							globalState.winner = remainingPlayers[0];
							globalState.gamePhase = 'finished';
						} else if (remainingPlayers.length === 0) {
							console.log(
								`ELIMINATION DEBUG: Game finished - everyone eliminated`
							);

							// Find the fastest answerer among all players for the final question
							const currentQuestionNumber = globalState.questionNumber;
							const allAnswerers = Object.entries(globalState.players)
								.filter(
									([_, player]) =>
										player.answerTimestamps[currentQuestionNumber]
								)
								.sort(
									(a, b) =>
										a[1].answerTimestamps[currentQuestionNumber] -
										b[1].answerTimestamps[currentQuestionNumber]
								);

							if (allAnswerers.length > 0) {
								const fastestAnswerer = allAnswerers[0][0];
								console.log(
									`ELIMINATION DEBUG: Fastest answerer wins: ${fastestAnswerer}`
								);
								globalState.winner = fastestAnswerer;
							}

							globalState.gamePhase = 'finished';
						} else {
							console.log(
								`ELIMINATION DEBUG: Game continues with ${remainingPlayers.length} remaining players`
							);
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
