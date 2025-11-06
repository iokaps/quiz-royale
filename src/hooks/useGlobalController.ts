import { kmClient } from '@/services/km-client';
import { globalStore } from '@/state/stores/global-store';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

export function useGlobalController() {
	const { controllerConnectionId } = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(1000); // tick every second

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		// Check if global controller is online
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		// Select new host, sorting by connection id
		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

	// Run global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}

		const { started, gamePhase, questionStartTime, currentQuestion } =
			globalStore.proxy;

		// Only run game logic if there are active players
		const { players } = globalStore.proxy;
		const activePlayers = Object.values(players).filter((p) => !p.isEliminated);
		const hasActivePlayers = activePlayers.length > 0;

		// Auto-eliminate players who don't answer in time (only if there are players)
		if (
			started &&
			gamePhase === 'question' &&
			questionStartTime &&
			currentQuestion &&
			hasActivePlayers
		) {
			const timeElapsed = serverTime - questionStartTime;
			const timeLimit = 10000; // Use config.questionTimeLimit

			if (timeElapsed >= timeLimit) {
				import('@/state/actions/global-actions')
					.then(({ globalActions }) => {
						globalActions.eliminateInactivePlayers();
					})
					.catch(console.error);
			}
		}

		// Auto-advance from reveal phase after showing results (only if there are players)
		if (started && gamePhase === 'reveal' && hasActivePlayers) {
			const revealDuration = 3000; // Use config.answerRevealTime
			const timeElapsed = serverTime - questionStartTime;

			if (timeElapsed >= 10000 + revealDuration) {
				// question time + reveal time
				console.log('Auto-advancing from reveal phase to next question');
				import('@/state/actions/global-actions')
					.then(({ globalActions }) => {
						globalActions.nextQuestion();
					})
					.catch(console.error);
			}
		}

		// Safety check: if we're stuck in transition for too long, force generate question
		// Only trigger if there's no current question, we have players, and we've been stuck for a while
		if (
			started &&
			gamePhase === 'transition' &&
			!currentQuestion &&
			hasActivePlayers
		) {
			const { questionStartTime, isGeneratingQuestion } = globalStore.proxy;
			const transitionTime =
				questionStartTime > 0 ? serverTime - questionStartTime : 0;

			// Only trigger safety check if we've been stuck in transition for a long time AND no generation is in progress
			// Use questionStartTime instead of startTimestamp to avoid conflicting with immediate nextQuestion flow
			if (transitionTime > 15000 && !isGeneratingQuestion) {
				// 15 seconds since transition started - much longer to avoid race conditions
				console.log('Game seems stuck in transition, safety check triggered');
				const questionNumber = globalStore.proxy.questionNumber;
				let difficulty: number;
				if (questionNumber <= 3) {
					difficulty = 1;
				} else if (questionNumber <= 6) {
					difficulty = 2;
				} else if (questionNumber <= 10) {
					difficulty = 3;
				} else {
					difficulty = Math.min(10, Math.floor((questionNumber - 3) / 5) + 4);
				}

				import('@/state/actions/global-actions')
					.then(({ globalActions }) => {
						globalActions.generateQuestion(difficulty);
					})
					.catch(console.error);
			}
		}
	}, [isGlobalController, serverTime]);

	return isGlobalController;
}
