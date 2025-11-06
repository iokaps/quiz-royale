import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore, type Question } from '../stores/global-store';

export const globalActions = {
	async startGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = true;
			globalState.startTimestamp = kmClient.serverTimestamp();
			globalState.gamePhase = 'transition'; // Start in transition, then move to question
			globalState.questionNumber = 1;
			globalState.eliminatedPlayers = [];
			globalState.winner = '';
			globalState.currentQuestion = null; // Clear any existing question
			globalState.questionStartTime = 0;

			// Clear all players from previous game - they will be re-added as they join
			globalState.players = {};
		});

		// Generate the first question immediately
		await this.generateQuestion(1);
	},

	async stopGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = false;
			globalState.startTimestamp = 0;
			globalState.gamePhase = 'lobby';
			globalState.currentQuestion = null;
			globalState.questionNumber = 0;
			globalState.questionStartTime = 0;
			globalState.eliminatedPlayers = [];
			globalState.winner = '';
			globalState.isGeneratingQuestion = false;

			// Reset all players' game state but keep them connected
			Object.values(globalState.players).forEach((player) => {
				player.isEliminated = false;
				player.eliminatedAtQuestion = 0;
				player.answers = {};
				player.hasAnswered = false;
			});
		});
	},

	async generateQuestion(difficulty: number) {
		const currentState = globalStore.proxy;

		// Prevent multiple simultaneous question generations
		if (currentState.isGeneratingQuestion) {
			console.log('Question generation already in progress, skipping...');
			return;
		}

		// Don't generate if we already have a current question
		if (currentState.currentQuestion) {
			console.log('Current question already exists, skipping generation...');
			return;
		}

		console.log(
			`Generating question with difficulty ${difficulty} for question #${currentState.questionNumber}`
		);

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.isGeneratingQuestion = true;
		});

		try {
			// Add randomness to ensure variety
			const categories = [
				'general knowledge',
				'science',
				'history',
				'sports',
				'entertainment',
				'geography',
				'literature',
				'movies',
				'music',
				'nature',
				'technology',
				'food',
				'art'
			];
			const randomCategory =
				categories[Math.floor(Math.random() * categories.length)];
			const questionNumber = globalStore.proxy.questionNumber;

			const prompt =
				config.aiUserPromptTemplate.replace(
					'{difficulty}',
					difficulty.toString()
				) +
				` Focus on ${randomCategory}. This is question ${questionNumber} - make sure it's completely different from previous questions.`;

			const response = await kmClient.chat(
				config.aiSystemPrompt,
				prompt,
				0.8, // Increased creativity
				250
			);

			const questionData = JSON.parse(response.content);
			const questionId = `q_${globalStore.proxy.questionNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
			const question: Question = {
				id: questionId,
				text: questionData.question,
				options: questionData.options,
				correctAnswer: questionData.correctAnswer,
				difficulty
			};

			console.log(`Generated new question: ${questionId} - "${question.text}"`);

			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.currentQuestion = question;
				globalState.questionStartTime = kmClient.serverTimestamp();
				globalState.gamePhase = 'question';
				globalState.isGeneratingQuestion = false;

				// Reset all players' answer status for this question
				Object.values(globalState.players).forEach((player) => {
					if (!player.isEliminated) {
						player.hasAnswered = false;
					}
				});
			});
		} catch (error) {
			console.error('Failed to generate question:', error);
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.isGeneratingQuestion = false;
			});
		}
	},

	async revealAnswer() {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (!globalState.currentQuestion) return;

			console.log(
				`Revealing answer for question ${globalState.questionNumber}`
			);
			globalState.gamePhase = 'reveal';

			// Process eliminations
			const correctAnswer = globalState.currentQuestion.correctAnswer;
			let newEliminations: string[] = [];

			console.log(`Correct answer is: ${correctAnswer}`);

			Object.entries(globalState.players).forEach(([clientId, player]) => {
				if (player.isEliminated) return;

				const playerAnswer = player.answers[globalState.questionNumber];
				const didNotAnswer = !player.hasAnswered;
				const answeredIncorrectly =
					playerAnswer && playerAnswer !== correctAnswer;

				console.log(
					`Player ${clientId}: answered=${playerAnswer}, hasAnswered=${player.hasAnswered}, correct=${correctAnswer}`
				);

				if (didNotAnswer || answeredIncorrectly) {
					console.log(
						`Eliminating player ${clientId} - didNotAnswer=${didNotAnswer}, answeredIncorrectly=${answeredIncorrectly}`
					);
					player.isEliminated = true;
					player.eliminatedAtQuestion = globalState.questionNumber;
					newEliminations.push(clientId);
				}
			});

			// Sort eliminations for consistent tie-breaking (lexicographical order by clientId)
			// This ensures that when multiple players are eliminated on the same question,
			// their final ranking is deterministic and fair
			newEliminations.sort();

			// Add to eliminated players list
			globalState.eliminatedPlayers.push(...newEliminations);

			console.log(
				`Eliminated ${newEliminations.length} players this round:`,
				newEliminations
			);

			// Check for winner (only one player remaining)
			const remainingPlayers = Object.entries(globalState.players)
				.filter(([_, player]) => !player.isEliminated)
				.map(([clientId]) => clientId);

			console.log(
				`Remaining players: ${remainingPlayers.length}`,
				remainingPlayers
			);

			if (remainingPlayers.length === 1) {
				console.log(`Game finished - winner: ${remainingPlayers[0]}`);
				globalState.winner = remainingPlayers[0];
				globalState.gamePhase = 'finished';
			} else if (remainingPlayers.length === 0) {
				console.log(`Game finished - everyone eliminated`);
				// Everyone eliminated
				globalState.gamePhase = 'finished';
			} else {
				console.log(`Game continues with ${remainingPlayers.length} players`);
			}
		});
	},

	async nextQuestion() {
		console.log(
			`Moving to next question. Current question number: ${globalStore.proxy.questionNumber}`
		);

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.gamePhase = 'transition';
			globalState.questionNumber += 1;
			globalState.currentQuestion = null; // Clear previous question immediately
			globalState.questionStartTime = 0;
		});

		// Calculate difficulty based on question number with gradual progression
		const questionNumber = globalStore.proxy.questionNumber;

		// More gradual difficulty curve:
		// Questions 1-3: Difficulty 1 (very easy)
		// Questions 4-6: Difficulty 2 (easy)
		// Questions 7-10: Difficulty 3 (easy-medium)
		// Questions 11-15: Difficulty 4 (medium)
		// Questions 16-20: Difficulty 5 (medium-hard)
		// Questions 21-25: Difficulty 6 (hard)
		// Questions 26-30: Difficulty 7 (very hard)
		// Questions 31+: Difficulty 8+ (extremely hard)
		let difficulty: number;
		if (questionNumber <= 3) {
			difficulty = 1;
		} else if (questionNumber <= 6) {
			difficulty = 2;
		} else if (questionNumber <= 10) {
			difficulty = 3;
		} else if (questionNumber <= 15) {
			difficulty = 4;
		} else if (questionNumber <= 20) {
			difficulty = 5;
		} else if (questionNumber <= 25) {
			difficulty = 6;
		} else if (questionNumber <= 30) {
			difficulty = 7;
		} else {
			difficulty = Math.min(10, 7 + Math.floor((questionNumber - 30) / 5));
		}

		console.log(
			`Next question will be #${questionNumber} with difficulty ${difficulty}`
		);

		// Generate next question immediately
		await this.generateQuestion(difficulty);
	},

	async eliminateInactivePlayers() {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.gamePhase !== 'question') return;

			const currentTime = kmClient.serverTimestamp();
			const timeLimit = config.questionTimeLimit;

			if (currentTime - globalState.questionStartTime >= timeLimit) {
				console.log('Time limit reached, processing timeout eliminations...');

				// Time's up - eliminate players who haven't answered
				const timeoutEliminations: string[] = [];

				Object.entries(globalState.players).forEach(([clientId, player]) => {
					if (!player.isEliminated && !player.hasAnswered) {
						console.log(`Eliminating player ${clientId} for timeout`);
						player.isEliminated = true;
						player.eliminatedAtQuestion = globalState.questionNumber;
						timeoutEliminations.push(clientId);
					}
				});

				// Sort timeout eliminations for consistent tie-breaking
				timeoutEliminations.sort();
				globalState.eliminatedPlayers.push(...timeoutEliminations);

				console.log(
					`Eliminated ${timeoutEliminations.length} players for timeout`
				);

				// Move to reveal phase
				globalState.gamePhase = 'reveal';
			}
		});
	}
};
