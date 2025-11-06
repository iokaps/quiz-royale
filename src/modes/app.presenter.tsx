import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { useServerTimer } from '@/hooks/useServerTime';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { KmQrCode, KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const {
		started,
		gamePhase,
		currentQuestion,
		questionNumber,
		questionStartTime,
		players,
		eliminatedPlayers,
		winner
	} = useSnapshot(globalStore.proxy);

	const serverTime = useServerTimer();

	useGlobalController();
	useDocumentTitle(title);

	if (kmClient.clientContext.mode !== 'presenter') {
		throw new Error('App presenter rendered in non-presenter mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const totalPlayers = Object.keys(players).length;
	const activePlayers = Object.values(players).filter(
		(p) => !p.isEliminated
	).length;
	const timeElapsed = questionStartTime ? serverTime - questionStartTime : 0;
	const timeRemaining = Math.max(0, config.questionTimeLimit - timeElapsed);

	if (!started) {
		return (
			<HostPresenterLayout.Root>
				<HostPresenterLayout.Header>
					<div className="text-sm opacity-70">{config.presenterLabel}</div>
				</HostPresenterLayout.Header>

				<HostPresenterLayout.Main>
					<div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
						{/* Join Info */}
						<div className="rounded-lg border border-gray-200 bg-white shadow-md">
							<div className="flex flex-col gap-4 p-8 text-center">
								<h2 className="text-3xl font-bold">{config.playerLinkLabel}</h2>
								<KmQrCode data={playerLink} size={300} interactive={false} />
								<div className="font-mono text-lg break-all text-blue-600">
									{playerLink.replace('https://', '').replace('http://', '')}
								</div>
							</div>
						</div>

						{/* Game Status */}
						<div className="space-y-6">
							<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
								<div className="prose prose-xl mx-auto text-center">
									<ReactMarkdown>{config.gameLobbyMd}</ReactMarkdown>
								</div>
							</div>

							<div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-md">
								<h3 className="mb-4 text-2xl font-bold">
									{config.players} Ready
								</h3>
								<div className="mb-2 text-6xl font-bold text-blue-600">
									{totalPlayers}
								</div>
								<div className="text-lg text-gray-600">
									Waiting for host to start...
								</div>
							</div>
						</div>
					</div>
				</HostPresenterLayout.Main>
			</HostPresenterLayout.Root>
		);
	}

	return (
		<HostPresenterLayout.Root>
			<HostPresenterLayout.Header>
				<div className="flex w-full items-center justify-between">
					<div className="text-xl font-bold">{config.presenterLabel}</div>
					<div className="grid grid-cols-3 gap-8 text-center">
						<div>
							<div className="text-3xl font-bold text-blue-600">
								{questionNumber}
							</div>
							<div className="text-sm text-gray-600">{config.question}</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-green-600">
								{activePlayers}
							</div>
							<div className="text-sm text-gray-600">
								{config.playersRemaining}
							</div>
						</div>
						<div>
							<div className="text-3xl font-bold text-red-600">
								{eliminatedPlayers.length}
							</div>
							<div className="text-sm text-gray-600">{config.eliminated}</div>
						</div>
					</div>
				</div>
			</HostPresenterLayout.Header>

			<HostPresenterLayout.Main>
				{/* Winner Announcement */}
				{gamePhase === 'finished' && winner && (
					<div className="rounded-lg border border-yellow-300 bg-yellow-50 p-12 text-center shadow-md">
						<div className="mb-4 text-8xl">🏆</div>
						<h2 className="mb-4 text-5xl font-bold text-yellow-800">
							{config.winner}!
						</h2>
						<p className="text-3xl text-yellow-700">
							<strong>{players[winner]?.name}</strong>
						</p>
						<p className="mt-2 text-2xl text-yellow-600">{config.champion}</p>
					</div>
				)}

				{/* Final Rankings Display */}
				{gamePhase === 'finished' && totalPlayers > 0 && (
					<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
						<h3 className="mb-6 text-center text-3xl font-bold text-gray-800">
							Final Rankings
						</h3>
						<div className="space-y-4">
							{(() => {
								// Create ranking list
								const rankingList: Array<{
									rank: number;
									clientId: string;
									name: string;
									isEliminated: boolean;
									eliminatedAtQuestion: number;
								}> = [];

								// Add winner (if exists)
								if (winner && players[winner]) {
									rankingList.push({
										rank: 1,
										clientId: winner,
										name: players[winner].name,
										isEliminated: false,
										eliminatedAtQuestion: 0
									});
								}

								// Add eliminated players in reverse elimination order (last eliminated gets better rank)
								const eliminatedPlayersList = Object.entries(players)
									.filter(([_, player]) => player.isEliminated)
									.sort(
										(a, b) =>
											b[1].eliminatedAtQuestion - a[1].eliminatedAtQuestion
									); // Sort by elimination question DESC

								let currentRank = winner ? 2 : 1;
								let lastEliminationQuestion = -1;
								let playersAtSameRank = 0;

								eliminatedPlayersList.forEach(([clientId, player]) => {
									if (player.eliminatedAtQuestion !== lastEliminationQuestion) {
										// New elimination round
										currentRank += playersAtSameRank;
										playersAtSameRank = 1;
										lastEliminationQuestion = player.eliminatedAtQuestion;
									} else {
										// Same elimination round
										playersAtSameRank++;
									}

									rankingList.push({
										rank: currentRank,
										clientId,
										name: player.name,
										isEliminated: true,
										eliminatedAtQuestion: player.eliminatedAtQuestion
									});
								});

								return rankingList.map((entry) => (
									<div
										key={entry.clientId}
										className={cn(
											'flex items-center justify-between rounded-lg p-4',
											entry.rank === 1 &&
												'border border-yellow-200 bg-yellow-50',
											entry.rank === 2 && 'border border-gray-200 bg-gray-50',
											entry.rank === 3 &&
												'border border-orange-200 bg-orange-50',
											entry.rank > 3 && 'border border-gray-100 bg-white'
										)}
									>
										<div className="flex items-center space-x-4">
											<div
												className={cn(
													'flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold',
													entry.rank === 1 && 'bg-yellow-500 text-white',
													entry.rank === 2 && 'bg-gray-400 text-white',
													entry.rank === 3 && 'bg-orange-500 text-white',
													entry.rank > 3 && 'bg-gray-200 text-gray-700'
												)}
											>
												{entry.rank === 1
													? '🏆'
													: entry.rank === 2
														? '🥈'
														: entry.rank === 3
															? '🥉'
															: entry.rank}
											</div>
											<div>
												<div className="text-xl font-semibold">
													{entry.name}
												</div>
												<div className="text-sm text-gray-600">
													{entry.isEliminated
														? `Eliminated on question ${entry.eliminatedAtQuestion}`
														: 'Winner!'}
												</div>
											</div>
										</div>
										<div className="text-right">
											<div className="text-2xl font-bold text-gray-700">
												#{entry.rank}
											</div>
											<div className="text-sm text-gray-500">
												of {totalPlayers}
											</div>
										</div>
									</div>
								));
							})()}
						</div>
					</div>
				)}

				{/* Current Question Display */}
				{currentQuestion && gamePhase !== 'finished' && (
					<div className="space-y-8">
						{/* Question Header with Timer */}
						<div className="text-center">
							<h2 className="mb-4 text-4xl font-bold">
								{config.question} {questionNumber}
							</h2>

							{gamePhase === 'question' && (
								<div className="text-2xl">
									<div className="mb-2 text-gray-600">
										{config.timeRemaining}
									</div>
									<div className="font-mono text-4xl">
										<KmTimeCountdown ms={timeRemaining} />
									</div>
								</div>
							)}
						</div>

						{/* Question Text */}
						<div className="rounded-lg bg-white p-12 text-center shadow-md">
							<h3 className="text-3xl font-bold">{currentQuestion.text}</h3>
						</div>

						{/* Answer Options */}
						<div className="grid grid-cols-2 gap-6">
							{Object.entries(currentQuestion.options).map(([key, text]) => {
								const isCorrect = key === currentQuestion.correctAnswer;
								return (
									<div
										key={key}
										className={cn(
											'flex items-center space-x-6 rounded-lg border-4 p-8 text-2xl',
											gamePhase === 'reveal' &&
												isCorrect &&
												'border-green-500 bg-green-50',
											gamePhase === 'reveal' &&
												!isCorrect &&
												'border-gray-300 bg-gray-50',
											gamePhase !== 'reveal' && 'border-blue-300 bg-blue-50'
										)}
									>
										<div
											className={cn(
												'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold',
												gamePhase === 'reveal' &&
													isCorrect &&
													'bg-green-500 text-white',
												gamePhase === 'reveal' &&
													!isCorrect &&
													'bg-gray-300 text-gray-700',
												gamePhase !== 'reveal' && 'bg-blue-500 text-white'
											)}
										>
											{key}
										</div>
										<span className="flex-1 font-semibold">{text}</span>
										{gamePhase === 'reveal' && isCorrect && (
											<span className="text-4xl text-green-600">✓</span>
										)}
									</div>
								);
							})}
						</div>

						{/* Answer Reveal Info */}
						{gamePhase === 'reveal' && (
							<div className="rounded-lg bg-green-50 p-8 text-center">
								<div className="mb-2 text-2xl font-bold text-green-800">
									{config.correctAnswer}: {currentQuestion.correctAnswer}
								</div>
								<div className="text-lg text-green-700">
									{eliminatedPlayers.length > 0
										? `${eliminatedPlayers.length} players eliminated this round`
										: 'All remaining players got it right!'}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Waiting for Next Question */}
				{gamePhase === 'transition' && (
					<div className="rounded-lg bg-blue-50 p-12 text-center shadow-md">
						<div className="prose prose-2xl mx-auto text-blue-800">
							<ReactMarkdown>{config.waitingForNextQuestionMd}</ReactMarkdown>
						</div>
					</div>
				)}
			</HostPresenterLayout.Main>
		</HostPresenterLayout.Root>
	);
};

export default App;
