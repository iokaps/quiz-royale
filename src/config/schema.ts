import { z } from 'zod/v4';

export const schema = z.object({
	// translations
	title: z.string().default('Quiz Royale'),

	gameLobbyMd: z
		.string()
		.default(
			'# Get ready for Quiz Royale!\nAnswer questions correctly to stay in the game. Last player standing wins!'
		),
	connectionsMd: z.string().default('# Players Connected'),
	questionMd: z.string().default('# Question'),
	eliminatedMd: z
		.string()
		.default('# You have been eliminated!\nBetter luck next time!'),
	winnerMd: z
		.string()
		.default('# Congratulations!\nYou are the Quiz Royale Champion!'),
	waitingForNextQuestionMd: z.string().default('# Next question coming up...'),

	players: z.string().default('Players'),
	playersRemaining: z.string().default('Players Remaining'),
	eliminated: z.string().default('Eliminated'),
	question: z.string().default('Question'),
	timeElapsed: z.string().default('Time elapsed'),
	timeRemaining: z.string().default('Time remaining'),
	startButton: z.string().default('Start Quiz Royale'),
	stopButton: z.string().default('Stop Game'),
	nextQuestionButton: z.string().default('Next Question'),
	loading: z.string().default('Loading...'),
	generateQuestionLoading: z.string().default('Generating question...'),

	menuTitle: z.string().default('Menu'),
	menuConnections: z.string().default('Players'),
	menuGameLobby: z.string().default('Lobby'),

	playerNameTitle: z.string().default('Enter Your Name'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Join Quiz Royale'),

	hostLabel: z.string().default('Quiz Master'),
	presenterLabel: z.string().default('Quiz Royale'),

	gameLinksTitle: z.string().default('Quiz Royale Links'),
	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Display'),

	menuAriaLabel: z.string().default('Open menu drawer'),

	// Quiz specific
	answerA: z.string().default('A'),
	answerB: z.string().default('B'),
	answerC: z.string().default('C'),
	answerD: z.string().default('D'),
	selectAnswer: z.string().default('Select your answer'),
	correctAnswer: z.string().default('Correct Answer'),
	yourAnswer: z.string().default('Your Answer'),
	finalScore: z.string().default('Final Score'),
	winner: z.string().default('Winner'),
	champion: z.string().default('Quiz Royale Champion'),

	// Timing (in milliseconds)
	questionTimeLimit: z.number().default(10000), // 10 seconds
	answerRevealTime: z.number().default(3000), // 3 seconds
	questionTransitionTime: z.number().default(1000), // 1 second - faster transitions

	// Audio settings
	enableAudio: z.boolean().default(true),
	correctAnswerSoundUrl: z.string().default(''), // URL to correct answer sound
	eliminationSoundUrl: z.string().default(''), // URL to elimination sound

	// AI Configuration
	aiSystemPrompt: z
		.string()
		.default(
			'You are a trivia question generator. Create engaging multiple-choice questions with exactly 4 options (A, B, C, D). Always vary the topic and category for each question. Return only valid JSON in this exact format: {"question": "Question text here?", "options": {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}, "correctAnswer": "A"}'
		),
	aiUserPromptTemplate: z
		.string()
		.default(
			'Generate a unique trivia question with difficulty level {difficulty}. Difficulty guidelines: 1=very basic common knowledge (colors, simple animals), 2=easy everyday facts, 3=school-level knowledge, 4=general education, 5=requires some expertise, 6=challenging specialized knowledge, 7=very difficult expert level, 8+=extremely obscure. Pick a random category from: general knowledge, science, history, sports, entertainment, geography, literature, movies, music, nature, technology, food, art. Ensure the question matches the difficulty level appropriately. Make it appropriate for all ages and avoid repetitive topics.'
		)
});

export type Config = z.infer<typeof schema>;
