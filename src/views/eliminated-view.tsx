import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { soundEffects } from '@/utils/audio';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

export const EliminatedView: React.FC = () => {
	const { players, eliminatedPlayers, questionNumber } = useSnapshot(
		globalStore.proxy
	);
	const currentPlayer = players[kmClient.id];

	// Play elimination sound when component first shows
	React.useEffect(() => {
		if (config.enableAudio && currentPlayer?.isEliminated) {
			soundEffects.elimination();
		}
	}, []); // Empty dependency array - only runs once when component mounts

	if (!currentPlayer || !currentPlayer.isEliminated) {
		return null;
	}

	// Calculate proper ranking based on elimination order
	const myEliminationQuestion = currentPlayer.eliminatedAtQuestion;
	const totalPlayers = Object.keys(players).length;

	// Count how many players were eliminated before this player
	const playersEliminatedBefore = Object.values(players).filter(
		(p) => p.isEliminated && p.eliminatedAtQuestion < myEliminationQuestion
	).length;

	// Count how many players were eliminated on the same question (including this player)
	const playersEliminatedSameQuestion = Object.values(players).filter(
		(p) => p.isEliminated && p.eliminatedAtQuestion === myEliminationQuestion
	).length;

	// Final rank = (players who performed better than me) + 1
	// Players who performed better = players still alive + players eliminated after me
	const playersStillAlive = Object.values(players).filter(
		(p) => !p.isEliminated
	).length;
	const playersEliminatedAfter = Object.values(players).filter(
		(p) => p.isEliminated && p.eliminatedAtQuestion > myEliminationQuestion
	).length;

	const finalRank = playersStillAlive + playersEliminatedAfter + 1;

	console.log(
		`RANKING DEBUG: clientId=${kmClient.id}, eliminatedAtQuestion=${myEliminationQuestion}, totalPlayers=${totalPlayers}, finalRank=${finalRank}`
	);
	console.log(
		`RANKING DEBUG: playersEliminatedBefore=${playersEliminatedBefore}, playersEliminatedSameQuestion=${playersEliminatedSameQuestion}, playersStillAlive=${playersStillAlive}`
	);

	return (
		<div className="mx-auto w-full max-w-2xl space-y-6">
			{/* Elimination Message */}
			<div className="rounded-lg bg-red-50 p-6 text-center shadow-md">
				<div className="prose prose-lg mx-auto text-red-800">
					<ReactMarkdown>{config.eliminatedMd}</ReactMarkdown>
				</div>
			</div>

			{/* Player Stats */}
			<div className="rounded-lg border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-lg">
				<h3 className="mb-6 text-center text-xl font-bold text-gray-800">
					{config.finalScore}
				</h3>

				<div className="space-y-4">
					{/* Final Ranking - Most Prominent */}
					<div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
						<div className="flex items-center justify-between">
							<span className="font-medium text-gray-700">Final Ranking:</span>
							<div className="flex items-center space-x-2">
								<span className="text-2xl font-bold text-indigo-600">
									#{finalRank}
								</span>
								<span className="font-medium text-gray-500">
									of {totalPlayers}
								</span>
								{finalRank <= 3 && (
									<span className="text-xl">
										{finalRank === 1 ? '🏆' : finalRank === 2 ? '🥈' : '🥉'}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Questions Answered */}
					<div className="rounded-lg border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-3">
						<div className="flex items-center justify-between">
							<span className="text-gray-700">Questions Answered:</span>
							<span className="text-lg font-bold text-emerald-600">
								{currentPlayer.eliminatedAtQuestion}
							</span>
						</div>
					</div>

					{/* Elimination Point */}
					<div className="rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-3">
						<div className="flex items-center justify-between">
							<span className="text-gray-700">{config.eliminated} At:</span>
							<span className="font-semibold text-amber-700">
								{config.question} {currentPlayer.eliminatedAtQuestion}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Game Progress */}
			<div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100 p-6">
				<h4 className="mb-4 flex items-center justify-center space-x-2 text-center font-semibold text-gray-800">
					<span>🎮</span>
					<span>Game in Progress</span>
				</h4>

				<div className="grid grid-cols-1 gap-3">
					<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="flex items-center space-x-1 text-gray-600">
								<span>❓</span>
								<span>Current Question:</span>
							</span>
							<span className="font-bold text-blue-600">#{questionNumber}</span>
						</div>
					</div>

					<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="flex items-center space-x-1 text-gray-600">
								<span>✅</span>
								<span>{config.playersRemaining}:</span>
							</span>
							<span className="font-bold text-green-600">
								{Object.values(players).filter((p) => !p.isEliminated).length}
							</span>
						</div>
					</div>

					<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
						<div className="flex items-center justify-between">
							<span className="flex items-center space-x-1 text-gray-600">
								<span>❌</span>
								<span>Total {config.eliminated}:</span>
							</span>
							<span className="font-bold text-red-600">
								{eliminatedPlayers.length}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Encouragement */}
			<div className="text-center text-gray-600">
				<p>Thanks for playing Quiz Royale! 🎯</p>
				<p className="mt-1 text-sm">
					Watch the game continue or wait for the next round!
				</p>
			</div>
		</div>
	);
};
