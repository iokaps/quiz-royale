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

		// Auto-eliminate players who don't answer in time
		if (
			started &&
			gamePhase === 'question' &&
			questionStartTime &&
			currentQuestion
		) {
			const timeElapsed = serverTime - questionStartTime;
			const timeLimit = 10000; // 10 second limit from config

			if (timeElapsed >= timeLimit) {
				import('@/state/actions/global-actions')
					.then(({ globalActions }) => {
						globalActions.eliminateInactivePlayers();
					})
					.catch(console.error);
			}
		}

		// Auto-advance from reveal phase after showing results
		if (started && gamePhase === 'reveal') {
			const revealDuration = 3000; // 3 seconds from config
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
		// Only trigger if there's no current question and we've been in transition for a while
		if (started && gamePhase === 'transition' && !currentQuestion) {
			const { startTimestamp } = globalStore.proxy;
			const gameRunningTime = serverTime - startTimestamp;

			// Only trigger safety check if game has been running for a while (to avoid startup issues)
			if (gameRunningTime > 30000) {
				// 30 seconds since game start
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
