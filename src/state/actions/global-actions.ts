import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore, type Question } from '../stores/global-store';

export const globalActions = {
	async startGame() {
		// First, generate all questions before starting the game
		console.log('Pre-generating questions for the entire game...');
		await this.generateAllQuestions();

		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = true;
			globalState.startTimestamp = kmClient.serverTimestamp();
			globalState.gamePhase = 'question'; // Start directly with first question
			globalState.questionNumber = 1;
			globalState.eliminatedPlayers = [];
			globalState.winner = '';
			globalState.questionStartTime = kmClient.serverTimestamp();

			// Set the first question from pre-generated questions
			if (globalState.questions.length > 0) {
				globalState.currentQuestion = globalState.questions[0];
			}

			// Reset existing players' game state but keep them registered
			Object.values(globalState.players).forEach((player) => {
				player.isEliminated = false;
				player.eliminatedAtQuestion = 0;
				player.answers = {};
				player.answerTimestamps = {};
				player.hasAnswered = false;
			});

			console.log(
				`GAME START DEBUG: Starting game with ${Object.keys(globalState.players).length} players and ${globalState.questions.length} pre-generated questions`
			);
			console.log(
				`GAME START DEBUG: Players:`,
				Object.entries(globalState.players).map(([id, p]) => `${id}: ${p.name}`)
			);
		});
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
			globalState.isGeneratingQuestions = false;
			globalState.questions = []; // Clear pre-generated questions

			// Reset all players' game state but keep them connected
			Object.values(globalState.players).forEach((player) => {
				player.isEliminated = false;
				player.eliminatedAtQuestion = 0;
				player.answers = {};
				player.answerTimestamps = {};
				player.hasAnswered = false;
			});
		});
	},

	async generateAllQuestions() {
		// Check if already generating
		const isAlreadyGenerating = await kmClient.transact(
			[globalStore],
			([globalState]) => {
				if (globalState.isGeneratingQuestions) {
					return true;
				}
				globalState.isGeneratingQuestions = true;
				globalState.questions = []; // Clear any existing questions
				return false;
			}
		);

		if (isAlreadyGenerating) {
			console.log('Questions are already being generated, skipping...');
			return;
		}

		const totalQuestions = 30; // Generate enough questions for a full game
		const questions: Question[] = [];
		const usedQuestionTexts = new Set<string>(); // Track used questions to avoid duplicates

		// Expanded category system with specific subcategories for better variety
		const categoryGroups = [
			{
				name: 'Science & Nature',
				subcategories: [
					'biology',
					'chemistry',
					'physics',
					'astronomy',
					'earth science',
					'wildlife',
					'botany',
					'human body'
				]
			},
			{
				name: 'History & Politics',
				subcategories: [
					'ancient history',
					'world wars',
					'medieval times',
					'modern history',
					'famous leaders',
					'civilizations',
					'revolutions'
				]
			},
			{
				name: 'Geography & Places',
				subcategories: [
					'world capitals',
					'landmarks',
					'countries',
					'rivers and mountains',
					'flags',
					'cities',
					'continents'
				]
			},
			{
				name: 'Arts & Literature',
				subcategories: [
					'famous authors',
					'classical literature',
					'poetry',
					'art movements',
					'famous paintings',
					'sculptures',
					'architecture'
				]
			},
			{
				name: 'Entertainment',
				subcategories: [
					'movies',
					'television',
					'music genres',
					'famous musicians',
					'actors',
					'directors',
					'awards'
				]
			},
			{
				name: 'Sports & Games',
				subcategories: [
					'olympics',
					'football',
					'basketball',
					'tennis',
					'soccer',
					'baseball',
					'extreme sports',
					'board games'
				]
			},
			{
				name: 'Technology & Innovation',
				subcategories: [
					'inventions',
					'computers',
					'internet',
					'space technology',
					'medical technology',
					'transportation'
				]
			},
			{
				name: 'Food & Culture',
				subcategories: [
					'world cuisines',
					'cooking techniques',
					'beverages',
					'cultural traditions',
					'festivals',
					'languages'
				]
			},
			{
				name: 'Mathematics & Logic',
				subcategories: [
					'basic math',
					'geometry',
					'famous mathematicians',
					'number theory',
					'puzzles',
					'statistics'
				]
			},
			{
				name: 'General Knowledge',
				subcategories: [
					'common facts',
					'everyday objects',
					'symbols',
					'measurements',
					'calendar facts',
					'basic science'
				]
			}
		];

		try {
			console.log(
				`Generating ${totalQuestions} questions with enhanced variety...`
			);

			// Create a balanced distribution of categories
			const questionsPerGroup = Math.floor(
				totalQuestions / categoryGroups.length
			);
			const remainingQuestions = totalQuestions % categoryGroups.length;

			let questionIndex = 0;
			let retryCount = 0;
			const maxRetries = 100; // Prevent infinite loops

			for (
				let groupIndex = 0;
				groupIndex < categoryGroups.length;
				groupIndex++
			) {
				const group = categoryGroups[groupIndex];
				const questionsForThisGroup =
					questionsPerGroup + (groupIndex < remainingQuestions ? 1 : 0);

				for (
					let groupQuestionIndex = 0;
					groupQuestionIndex < questionsForThisGroup;
					groupQuestionIndex++
				) {
					questionIndex++;

					// Calculate difficulty based on question number with gradual progression
					let difficulty: number;
					if (questionIndex <= 3) {
						difficulty = 1;
					} else if (questionIndex <= 6) {
						difficulty = 2;
					} else if (questionIndex <= 10) {
						difficulty = 3;
					} else if (questionIndex <= 15) {
						difficulty = 4;
					} else if (questionIndex <= 20) {
						difficulty = 5;
					} else if (questionIndex <= 25) {
						difficulty = 6;
					} else if (questionIndex <= 30) {
						difficulty = 7;
					} else {
						difficulty = Math.min(10, 7 + Math.floor((questionIndex - 30) / 5));
					}

					// Select a random subcategory from this group
					const randomSubcategory =
						group.subcategories[
							Math.floor(Math.random() * group.subcategories.length)
						];

					console.log(
						`Generating question ${questionIndex}/${totalQuestions} (difficulty ${difficulty}, category: ${group.name} - ${randomSubcategory})`
					);

					// Enhanced prompt with variety and uniqueness instructions
					const varietyPrompt = `Generate a unique trivia question about ${randomSubcategory} (${group.name} category) with difficulty level ${difficulty}. 

CRITICAL: Make this question completely unique and different from typical trivia questions. Avoid common, overused questions.

Difficulty guidelines: 
- 1=very basic (colors, simple animals, basic facts)
- 2=easy everyday knowledge 
- 3=school-level education
- 4=general adult knowledge
- 5=requires some expertise/specialization
- 6=challenging specialized knowledge
- 7=very difficult expert level

Requirements:
- Focus specifically on ${randomSubcategory}
- Make the question engaging and educational
- Ensure all 4 options are plausible but only one is correct
- Avoid repetitive question patterns
- Question ${questionIndex} of 30 - ensure variety from previous questions
- Age-appropriate content
- Clear, unambiguous wording`;

					const response = await kmClient.chat(
						config.aiSystemPrompt,
						varietyPrompt,
						0.9, // High creativity for uniqueness
						300 // Longer response for detailed questions
					);

					const questionData = JSON.parse(response.content);
					const questionText = questionData.question.toLowerCase().trim();

					// Check for duplicate questions
					if (usedQuestionTexts.has(questionText)) {
						console.log(
							`Duplicate question detected, retrying... (attempt ${retryCount + 1})`
						);
						retryCount++;

						if (retryCount < maxRetries) {
							groupQuestionIndex--; // Retry this question
							questionIndex--;
							continue;
						} else {
							console.warn(
								`Max retries reached, allowing potential duplicate for question ${questionIndex}`
							);
						}
					}

					usedQuestionTexts.add(questionText);
					retryCount = 0; // Reset retry count on success

					const questionId = `q_${questionIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
					const question: Question = {
						id: questionId,
						text: questionData.question,
						options: questionData.options,
						correctAnswer: questionData.correctAnswer,
						difficulty
					};

					questions.push(question);
					console.log(
						`Generated question ${questionIndex}: "${question.text}" (${group.name} - ${randomSubcategory})`
					);
				}
			}

			// Store all generated questions
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.questions = questions;
				globalState.isGeneratingQuestions = false;
			});

			console.log(`Successfully generated ${questions.length} questions!`);
		} catch (error) {
			console.error('Failed to generate questions:', error);
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.isGeneratingQuestions = false;
			});
		}
	},

	async generateQuestion(difficulty: number) {
		// Use a transaction to atomically check and set the generation flag
		const canGenerate = await kmClient.transact(
			[globalStore],
			([globalState]) => {
				// Prevent multiple simultaneous question generations
				if (globalState.isGeneratingQuestion) {
					return false;
				}

				// Don't generate if we already have a current question or are in question phase
				if (
					globalState.currentQuestion ||
					globalState.gamePhase === 'question'
				) {
					return false;
				}

				// Atomically set the generation flag
				globalState.isGeneratingQuestion = true;
				return true;
			}
		);

		if (!canGenerate) {
			console.log(
				'Question generation already in progress or question exists, skipping...'
			);
			return;
		}

		const currentState = globalStore.proxy;

		// Don't generate questions if no players are in the game
		const activePlayers = Object.values(currentState.players).filter(
			(p) => !p.isEliminated
		);
		console.log(
			`PLAYER DEBUG: Checking for active players. Total players: ${Object.keys(currentState.players).length}, Active players: ${activePlayers.length}`
		);
		console.log(
			`PLAYER DEBUG: All players:`,
			Object.entries(currentState.players).map(
				([id, p]) => `${id}: ${p.name} (eliminated: ${p.isEliminated})`
			)
		);

		if (activePlayers.length === 0) {
			console.log('No active players, skipping question generation');
			await kmClient.transact([globalStore], ([globalState]) => {
				globalState.isGeneratingQuestion = false;
			});
			return;
		}

		console.log(
			`Generating question with difficulty ${difficulty} for question #${currentState.questionNumber}`
		);

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

				// Find the fastest answerer among all players for the final question
				const currentQuestionNumber = globalState.questionNumber;
				const allAnswerers = Object.entries(globalState.players)
					.filter(
						([_, player]) => player.answerTimestamps[currentQuestionNumber]
					)
					.sort(
						(a, b) =>
							a[1].answerTimestamps[currentQuestionNumber] -
							b[1].answerTimestamps[currentQuestionNumber]
					);

				if (allAnswerers.length > 0) {
					const fastestAnswerer = allAnswerers[0][0];
					console.log(`Fastest answerer wins: ${fastestAnswerer}`);
					globalState.winner = fastestAnswerer;
				}

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
			globalState.questionNumber += 1;
			const nextQuestionIndex = globalState.questionNumber - 1; // Array is 0-indexed

			// Check if we have more questions available
			if (nextQuestionIndex < globalState.questions.length) {
				// Set the next pre-generated question
				globalState.currentQuestion = globalState.questions[nextQuestionIndex];
				globalState.gamePhase = 'question';
				globalState.questionStartTime = kmClient.serverTimestamp();

				// Reset all players' answer status for this question
				Object.values(globalState.players).forEach((player) => {
					if (!player.isEliminated) {
						player.hasAnswered = false;
					}
				});

				console.log(
					`Next question will be #${globalState.questionNumber}: "${globalState.currentQuestion.text}"`
				);
			} else {
				// No more questions available, end the game
				console.log('No more questions available, ending game');
				globalState.gamePhase = 'finished';

				// If no winner has been determined yet, find the last player(s) standing
				if (!globalState.winner) {
					const remainingPlayers = Object.entries(globalState.players)
						.filter(([_, player]) => !player.isEliminated)
						.map(([clientId]) => clientId);

					if (remainingPlayers.length === 1) {
						globalState.winner = remainingPlayers[0];
						console.log(`Game ended - final winner: ${remainingPlayers[0]}`);
					} else if (remainingPlayers.length > 1) {
						// Multiple players survived all questions - pick one randomly or by some criteria
						// For fairness, we can pick the one with fastest average response time
						let fastestPlayer = remainingPlayers[0];
						let fastestAvgTime = Number.MAX_VALUE;

						remainingPlayers.forEach((clientId) => {
							const player = globalState.players[clientId];
							const timestamps = Object.values(player.answerTimestamps);
							if (timestamps.length > 0) {
								const avgTime =
									timestamps.reduce((sum, time) => sum + time, 0) /
									timestamps.length;
								if (avgTime < fastestAvgTime) {
									fastestAvgTime = avgTime;
									fastestPlayer = clientId;
								}
							}
						});

						globalState.winner = fastestPlayer;
						console.log(
							`Game ended - fastest overall player wins: ${fastestPlayer}`
						);
					}
				}
			}
		});
	},

	async eliminateInactivePlayers() {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.gamePhase !== 'question') return;

			// Don't process eliminations if no players are in the game
			const activePlayers = Object.values(globalState.players).filter(
				(p) => !p.isEliminated
			);
			if (activePlayers.length === 0) {
				console.log('No active players, skipping timeout elimination');
				return;
			}

			const currentTime = kmClient.serverTimestamp();
			const timeLimit = config.questionTimeLimit;

			if (currentTime - globalState.questionStartTime >= timeLimit) {
				console.log('Time limit reached, processing timeout eliminations...');

				// Time's up - eliminate players who haven't answered AND those who answered incorrectly
				const correctAnswer = globalState.currentQuestion?.correctAnswer;
				const allEliminations: string[] = [];

				console.log(
					`TIMEOUT DEBUG: Processing eliminations for question ${globalState.questionNumber}, correct answer: ${correctAnswer}`
				);

				Object.entries(globalState.players).forEach(([clientId, player]) => {
					if (player.isEliminated) return;

					const playerAnswer = player.answers[globalState.questionNumber];
					const didNotAnswer = !player.hasAnswered;
					const answeredIncorrectly =
						playerAnswer && playerAnswer !== correctAnswer;

					console.log(
						`TIMEOUT DEBUG: Player ${clientId} - answer: ${playerAnswer}, hasAnswered: ${player.hasAnswered}, didNotAnswer: ${didNotAnswer}, answeredIncorrectly: ${answeredIncorrectly}`
					);

					if (didNotAnswer || answeredIncorrectly) {
						if (didNotAnswer) {
							console.log(`Eliminating player ${clientId} for timeout`);
						} else {
							console.log(
								`Eliminating player ${clientId} for wrong answer: ${playerAnswer} (correct: ${correctAnswer})`
							);
						}
						player.isEliminated = true;
						player.eliminatedAtQuestion = globalState.questionNumber;
						allEliminations.push(clientId);
					} else {
						console.log(
							`TIMEOUT DEBUG: Player ${clientId} survives with correct answer: ${playerAnswer}`
						);
					}
				});

				// Sort eliminations for consistent tie-breaking
				allEliminations.sort();
				globalState.eliminatedPlayers.push(...allEliminations);

				console.log(
					`Eliminated ${allEliminations.length} players (timeout + wrong answers)`
				);

				// Check for winner after timeout eliminations
				const remainingPlayers = Object.entries(globalState.players)
					.filter(([_, player]) => !player.isEliminated)
					.map(([clientId]) => clientId);

				console.log(
					`TIMEOUT DEBUG: After eliminations, remaining players: ${remainingPlayers.length}`,
					remainingPlayers
				);

				if (remainingPlayers.length === 1) {
					console.log(
						`TIMEOUT DEBUG: Game finished - winner: ${remainingPlayers[0]}`
					);
					globalState.winner = remainingPlayers[0];
					globalState.gamePhase = 'finished';
				} else if (remainingPlayers.length === 0) {
					console.log(
						`TIMEOUT DEBUG: Game finished - everyone eliminated by timeout`
					);

					// Find the fastest answerer among all players for the final question
					const currentQuestionNumber = globalState.questionNumber;
					const allAnswerers = Object.entries(globalState.players)
						.filter(
							([_, player]) => player.answerTimestamps[currentQuestionNumber]
						)
						.sort(
							(a, b) =>
								a[1].answerTimestamps[currentQuestionNumber] -
								b[1].answerTimestamps[currentQuestionNumber]
						);

					if (allAnswerers.length > 0) {
						const fastestAnswerer = allAnswerers[0][0];
						console.log(
							`TIMEOUT DEBUG: Fastest answerer wins: ${fastestAnswerer}`
						);
						globalState.winner = fastestAnswerer;
					}

					globalState.gamePhase = 'finished';
				} else {
					console.log(
						`TIMEOUT DEBUG: Game continues with ${remainingPlayers.length} players`
					);
					// Move to reveal phase
					globalState.gamePhase = 'reveal';
				}
			}
		});
	}
};
