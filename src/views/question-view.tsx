import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { soundEffects } from '@/utils/audio';
import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

export const QuestionView: React.FC = () => {
	const { currentQuestion, questionStartTime, gamePhase } = useSnapshot(
		globalStore.proxy
	);
	const { selectedAnswer } = useSnapshot(playerStore.proxy);
	const serverTime = useServerTimer();

	const timeElapsed = serverTime - questionStartTime;
	const timeRemaining = Math.max(0, config.questionTimeLimit - timeElapsed);

	// Clear selected answer when a new question starts
	React.useEffect(() => {
		if (currentQuestion && gamePhase === 'question') {
			playerActions.clearSelectedAnswer();
		}
	}, [currentQuestion?.id, gamePhase]);

	// Audio feedback for correct/incorrect answers
	React.useEffect(() => {
		if (gamePhase === 'reveal' && currentQuestion && selectedAnswer) {
			const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

			if (config.enableAudio) {
				if (isCorrect) {
					soundEffects.correctAnswer();
				} else {
					soundEffects.elimination();
				}
			}
		}
	}, [gamePhase, currentQuestion, selectedAnswer]);

	if (!currentQuestion) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="text-center">
					{gamePhase === 'transition' ? (
						<div className="prose prose-lg mx-auto">
							<ReactMarkdown>{config.waitingForNextQuestionMd}</ReactMarkdown>
						</div>
					) : (
						<div className="text-lg font-medium">
							{config.generateQuestionLoading}
						</div>
					)}
				</div>
			</div>
		);
	}

	const handleAnswerSelect = async (answer: 'A' | 'B' | 'C' | 'D') => {
		if (gamePhase !== 'question') return;

		await playerActions.selectAnswer(answer);
		await playerActions.submitAnswer(answer);
	};

	const isAnswerSelected = (answer: 'A' | 'B' | 'C' | 'D') =>
		selectedAnswer === answer;
	const showResults = gamePhase === 'reveal';
	const isCorrectAnswer = (answer: 'A' | 'B' | 'C' | 'D') =>
		answer === currentQuestion.correctAnswer;

	return (
		<div className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-6">
			{/* Question Header */}
			<div className="text-center">
				<h2 className="text-xl font-bold sm:text-2xl">{config.question}</h2>

				{!showResults && (
					<div className="mt-3">
						<div className="mb-2 text-sm text-gray-600">
							{config.timeRemaining}
						</div>
						<div className="font-mono text-2xl font-bold">
							<KmTimeCountdown ms={timeRemaining} />
						</div>
					</div>
				)}
			</div>

			{/* Question Text */}
			<div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
				<h3 className="text-lg leading-relaxed font-semibold sm:text-xl">
					{currentQuestion.text}
				</h3>
			</div>

			{/* Answer Options */}
			<div className="grid grid-cols-1 gap-4">
				{Object.entries(currentQuestion.options).map(([key, text]) => {
					const answerKey = key as 'A' | 'B' | 'C' | 'D';
					const selected = isAnswerSelected(answerKey);
					const isCorrect = isCorrectAnswer(answerKey);
					const playerAnswered = selectedAnswer === answerKey;

					let buttonClass =
						'w-full rounded-lg border-2 p-5 text-left transition-all duration-200 touch-manipulation ';

					if (showResults) {
						if (isCorrect) {
							buttonClass += 'border-green-500 bg-green-100 text-green-800 ';
						} else if (playerAnswered) {
							buttonClass += 'border-red-500 bg-red-100 text-red-800 ';
						} else {
							buttonClass += 'border-gray-300 bg-gray-50 text-gray-600 ';
						}
					} else {
						if (selected) {
							buttonClass += 'border-blue-500 bg-blue-100 text-blue-800 ';
						} else {
							buttonClass +=
								'border-gray-300 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100 ';
						}
					}

					return (
						<button
							key={answerKey}
							onClick={() => handleAnswerSelect(answerKey)}
							disabled={gamePhase !== 'question' || !!selectedAnswer}
							className={buttonClass}
						>
							<div className="flex items-center space-x-4">
								<div
									className={cn(
										'flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold',
										showResults && isCorrect && 'bg-green-500 text-white',
										showResults &&
											playerAnswered &&
											!isCorrect &&
											'bg-red-500 text-white',
										!showResults && selected && 'bg-blue-500 text-white',
										!showResults && !selected && 'bg-gray-200 text-gray-700'
									)}
								>
									{answerKey}
								</div>
								<span className="flex-1 text-base leading-relaxed sm:text-lg">
									{text}
								</span>
								{showResults && isCorrect && (
									<div className="text-green-600">✓</div>
								)}
								{showResults && playerAnswered && !isCorrect && (
									<div className="text-red-600">✗</div>
								)}
							</div>
						</button>
					);
				})}
			</div>

			{/* Results Info */}
			{showResults &&
				selectedAnswer &&
				selectedAnswer !== currentQuestion.correctAnswer && (
					<div className="rounded-lg bg-gray-50 p-4 text-center">
						<div className="space-y-2">
							<div className="text-sm text-gray-600">
								{config.correctAnswer}: {currentQuestion.correctAnswer}
							</div>
							<div className="text-sm text-gray-600">
								{config.yourAnswer}: {selectedAnswer}
							</div>
						</div>
					</div>
				)}
		</div>
	);
};
