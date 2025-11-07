import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { soundEffects } from '@/utils/audio';
import { KmConfettiProvider } from '@kokimoki/shared';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { useSnapshot } from 'valtio';

export const WinnerView: React.FC = () => {
	const { players, winner, questionNumber } = useSnapshot(globalStore.proxy);
	const isWinner = winner === kmClient.id;
	const winnerPlayer = winner ? players[winner] : null;

	React.useEffect(() => {
		if (isWinner) {
			// Play winner celebration sound
			if (config.enableAudio) {
				soundEffects.correctAnswer(); // Use happy sound for winner
			}

			// Trigger confetti celebration
			const timer = setTimeout(() => {
				// Additional celebration effects could be added here
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [isWinner]);

	if (!winnerPlayer && winner) {
		// Winner is set but player data is missing - try to find from active players
		const remainingPlayers = Object.entries(players).filter(
			([_, player]) => !player.isEliminated
		);
		if (remainingPlayers.length === 1) {
			// If there's exactly one remaining player, they should be the winner
			const actualWinner = remainingPlayers[0];
			console.log(
				`WINNER DEBUG: Correcting winner from ${winner} to ${actualWinner[0]}`
			);
			return (
				<div className="mx-auto w-full max-w-2xl space-y-6">
					<div className="rounded-lg bg-yellow-50 p-6 text-center shadow-md">
						<div className="mb-4 text-6xl">🏆</div>
						<div className="prose prose-lg mx-auto text-yellow-800">
							<ReactMarkdown>{config.winnerMd}</ReactMarkdown>
						</div>
						<div className="mt-4 text-2xl font-bold text-yellow-700">
							{actualWinner[1].name}
						</div>
					</div>
				</div>
			);
		}
	}

	if (!winnerPlayer) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="text-center">
					<div className="text-lg font-medium">Game Over</div>
					<div className="mt-2 text-gray-600">No winner determined</div>
				</div>
			</div>
		);
	}

	return (
		<KmConfettiProvider>
			<div className="mx-auto w-full max-w-2xl space-y-6">
				{/* Winner Announcement */}
				<div
					className={`rounded-lg p-6 text-center shadow-md ${
						isWinner ? 'bg-yellow-50' : 'bg-green-50'
					}`}
				>
					<div
						className={`prose prose-lg mx-auto ${
							isWinner ? 'text-yellow-800' : 'text-green-800'
						}`}
					>
						{isWinner ? (
							<ReactMarkdown>{config.winnerMd}</ReactMarkdown>
						) : (
							<div>
								<h2>🏆 {config.winner}</h2>
								<p>
									<strong>{winnerPlayer.name}</strong> is the {config.champion}!
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Winner Stats */}
				<div className="rounded-lg border border-yellow-200 bg-gradient-to-br from-white to-yellow-50 p-6 shadow-lg">
					<h3 className="mb-6 text-center text-xl font-bold text-gray-800">
						{isWinner ? 'Your Victory Stats' : 'Champion Stats'}
					</h3>

					<div className="space-y-4">
						{/* Champion Name - Most Prominent */}
						<div className="to-gold-100 rounded-lg border border-yellow-300 bg-gradient-to-r from-yellow-100 p-4">
							<div className="flex items-center justify-between">
								<span className="font-medium text-gray-700">🏆 Champion:</span>
								<span className="text-2xl font-bold text-yellow-700">
									{isWinner ? 'You!' : winnerPlayer.name}
								</span>
							</div>
						</div>

						{/* Final Ranking */}
						<div className="rounded-lg border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-3">
							<div className="flex items-center justify-between">
								<span className="text-gray-700">Final Ranking:</span>
								<div className="flex items-center space-x-2">
									<span className="text-xl font-bold text-purple-600">#1</span>
									<span className="text-2xl">🏆</span>
								</div>
							</div>
						</div>

						{/* Questions Survived */}
						<div className="rounded-lg border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-3">
							<div className="flex items-center justify-between">
								<span className="text-gray-700">Questions Survived:</span>
								<span className="text-lg font-bold text-emerald-600">
									{questionNumber - 1}
								</span>
							</div>
						</div>

						{/* Total Players */}
						<div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
							<div className="flex items-center justify-between">
								<span className="text-gray-700">Total Players:</span>
								<span className="font-semibold text-indigo-600">
									{Object.keys(players).length}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Game Summary */}
				<div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100 p-6">
					<h4 className="mb-4 flex items-center justify-center space-x-2 text-center font-semibold text-gray-800">
						<span>📊</span>
						<span>Game Summary</span>
					</h4>

					<div className="grid grid-cols-1 gap-3">
						<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
							<div className="flex items-center justify-between">
								<span className="flex items-center space-x-1 text-gray-600">
									<span>❓</span>
									<span>Total Questions:</span>
								</span>
								<span className="font-bold text-blue-600">
									{questionNumber - 1}
								</span>
							</div>
						</div>

						<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
							<div className="flex items-center justify-between">
								<span className="flex items-center space-x-1 text-gray-600">
									<span>❌</span>
									<span>Players Eliminated:</span>
								</span>
								<span className="font-bold text-red-600">
									{Object.keys(players).length - 1}
								</span>
							</div>
						</div>

						<div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
							<div className="flex items-center justify-between">
								<span className="flex items-center space-x-1 text-gray-600">
									<span>⏱️</span>
									<span>Game Duration:</span>
								</span>
								<span className="font-bold text-purple-600">
									{Math.ceil((questionNumber - 1) * 15)} seconds
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Achievement Badge */}
				<div className="text-center">
					<div className="inline-flex items-center space-x-2 rounded-full bg-yellow-100 px-4 py-2 text-yellow-800">
						<span className="text-2xl">🏆</span>
						<span className="font-semibold">{config.champion}</span>
					</div>
				</div>

				{/* Thank You Message */}
				<div className="text-center text-gray-600">
					<p>Thanks for playing Quiz Royale! 🎉</p>
					{isWinner && (
						<p className="mt-1 text-sm font-medium text-yellow-700">
							Congratulations on your amazing victory!
						</p>
					)}
				</div>
			</div>
		</KmConfettiProvider>
	);
};
