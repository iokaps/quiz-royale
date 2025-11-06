import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';

import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

export const HostGameView: React.FC = () => {
	const {
		started,
		gamePhase,
		currentQuestion,
		questionNumber,
		questionStartTime,
		players,
		eliminatedPlayers,
		winner,
		isGeneratingQuestion
	} = useSnapshot(globalStore.proxy);

	const onlineClientIds = useSnapshot(globalStore.connections).clientIds;
	const serverTime = useServerTimer();

	const totalPlayers = Object.keys(players).length;
	const activePlayers = Object.values(players).filter(
		(p) => !p.isEliminated
	).length;
	const answeredPlayers = Object.values(players).filter(
		(p) => p.hasAnswered && !p.isEliminated
	).length;

	const timeElapsed = questionStartTime ? serverTime - questionStartTime : 0;
	const timeRemaining = Math.max(0, config.questionTimeLimit - timeElapsed);

	const handleStartGame = async () => {
		await globalActions.startGame();
	};

	const handleStopGame = async () => {
		await globalActions.stopGame();
	};

	const handleNextQuestion = async () => {
		if (gamePhase === 'reveal') {
			await globalActions.nextQuestion();
		} else if (gamePhase === 'question') {
			await globalActions.revealAnswer();
		}
	};

	if (!started) {
		return (
			<div className="space-y-6">
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
					<div className="prose prose-lg mx-auto text-center">
						<ReactMarkdown>{config.gameLobbyMd}</ReactMarkdown>
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
					<h3 className="mb-4 text-lg font-semibold">
						{config.players} Connected
					</h3>
					<div className="mb-4 text-2xl font-bold">{totalPlayers}</div>

					{totalPlayers > 0 && (
						<div className="space-y-2">
							{Object.entries(players).map(([clientId, player]) => (
								<div
									key={clientId}
									className="flex items-center justify-between"
								>
									<span>{player.name}</span>
									<span
										className={cn(
											'rounded-full px-2 py-1 text-xs',
											onlineClientIds.has(clientId)
												? 'bg-green-100 text-green-800'
												: 'bg-gray-100 text-gray-800'
										)}
									>
										{onlineClientIds.has(clientId) ? 'Online' : 'Offline'}
									</span>
								</div>
							))}
						</div>
					)}

					<button
						onClick={handleStartGame}
						disabled={totalPlayers === 0}
						className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
					>
						{config.startButton}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Game Status */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
				<div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
					<div>
						<div className="text-2xl font-bold text-blue-600">
							{questionNumber}
						</div>
						<div className="text-sm text-gray-600">{config.question}</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-green-600">
							{activePlayers}
						</div>
						<div className="text-sm text-gray-600">
							{config.playersRemaining}
						</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-red-600">
							{eliminatedPlayers.length}
						</div>
						<div className="text-sm text-gray-600">{config.eliminated}</div>
					</div>
					<div>
						<div className="text-2xl font-bold text-purple-600">
							{answeredPlayers}/{activePlayers}
						</div>
						<div className="text-sm text-gray-600">Answered</div>
					</div>
				</div>
			</div>

			{/* Current Question */}
			{currentQuestion && (
				<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
					<h3 className="mb-4 text-lg font-semibold">
						{config.question} {questionNumber}
						{gamePhase === 'question' && (
							<span className="ml-2 text-sm text-gray-500">
								(
								{timeRemaining > 0 ? (
									<KmTimeCountdown ms={timeRemaining} />
								) : (
									'Time Up!'
								)}
								)
							</span>
						)}
					</h3>

					<div className="mb-4 text-xl font-medium">{currentQuestion.text}</div>

					<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
						{Object.entries(currentQuestion.options).map(([key, text]) => {
							const isCorrect = key === currentQuestion.correctAnswer;
							return (
								<div
									key={key}
									className={cn(
										'flex items-center space-x-2 rounded-lg border p-3',
										gamePhase === 'reveal' &&
											isCorrect &&
											'border-green-500 bg-green-50',
										gamePhase === 'reveal' &&
											!isCorrect &&
											'border-gray-300 bg-gray-50',
										gamePhase !== 'reveal' && 'border-gray-300 bg-white'
									)}
								>
									<span
										className={cn(
											'flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold',
											gamePhase === 'reveal' &&
												isCorrect &&
												'bg-green-500 text-white',
											gamePhase === 'reveal' &&
												!isCorrect &&
												'bg-gray-300 text-gray-700',
											gamePhase !== 'reveal' && 'bg-blue-100 text-blue-800'
										)}
									>
										{key}
									</span>
									<span className="flex-1">{text}</span>
									{gamePhase === 'reveal' && isCorrect && (
										<span className="text-green-600">✓</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Winner Announcement */}
			{gamePhase === 'finished' && winner && (
				<div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6 shadow-md">
					<h3 className="mb-2 text-xl font-bold text-yellow-800">
						🏆 {config.winner}!
					</h3>
					<p className="text-lg text-yellow-700">
						<strong>{players[winner]?.name}</strong> is the {config.champion}!
					</p>
				</div>
			)}

			{/* Game Controls */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
				<div className="flex flex-wrap gap-3">
					{gamePhase === 'question' && (
						<button
							onClick={handleNextQuestion}
							className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
						>
							Reveal Answer
						</button>
					)}

					{gamePhase === 'reveal' && activePlayers > 1 && (
						<button
							onClick={handleNextQuestion}
							disabled={isGeneratingQuestion}
							className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
						>
							{isGeneratingQuestion
								? config.generateQuestionLoading
								: config.nextQuestionButton}
						</button>
					)}

					<button
						onClick={handleStopGame}
						className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
					>
						{config.stopButton}
					</button>
				</div>
			</div>

			{/* Player List */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
				<h3 className="mb-4 text-lg font-semibold">{config.players}</h3>
				<div className="max-h-60 space-y-2 overflow-y-auto">
					{Object.entries(players).map(([clientId, player]) => (
						<div
							key={clientId}
							className="flex items-center justify-between text-sm"
						>
							<span
								className={cn(
									player.isEliminated && 'text-gray-500 line-through'
								)}
							>
								{player.name}
							</span>
							<div className="flex space-x-2">
								{player.isEliminated ? (
									<span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
										Out Q{player.eliminatedAtQuestion}
									</span>
								) : (
									<>
										{player.hasAnswered && gamePhase === 'question' && (
											<span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
												Answered
											</span>
										)}
										{winner === clientId && (
											<span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
												Winner! 🏆
											</span>
										)}
									</>
								)}
								<span
									className={cn(
										'rounded-full px-2 py-1 text-xs',
										onlineClientIds.has(clientId)
											? 'bg-green-100 text-green-800'
											: 'bg-gray-100 text-gray-800'
									)}
								>
									{onlineClientIds.has(clientId) ? 'Online' : 'Offline'}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
