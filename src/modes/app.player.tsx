import { PlayerMenu } from '@/components/player/menu';
import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { ConnectionsView } from '@/views/connections-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { EliminatedView } from '@/views/eliminated-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { QuestionView } from '@/views/question-view';
import { WinnerView } from '@/views/winner-view';
import { KmModalProvider } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView } = useSnapshot(playerStore.proxy);
	const { started, gamePhase, players, winner } = useSnapshot(
		globalStore.proxy
	);

	useGlobalController();
	useDocumentTitle(title);

	React.useEffect(() => {
		if (!started) {
			playerActions.setCurrentView('lobby');
			// Clear any selected answer when game stops
			playerActions.clearSelectedAnswer();
			return;
		}

		// Handle game state transitions for players
		const currentPlayer = players[kmClient.id];

		if (winner === kmClient.id) {
			playerActions.setCurrentView('winner');
		} else if (currentPlayer?.isEliminated) {
			playerActions.setCurrentView('eliminated');
		} else if (
			gamePhase === 'question' ||
			gamePhase === 'reveal' ||
			gamePhase === 'transition'
		) {
			playerActions.setCurrentView('question');
		} else if (gamePhase === 'finished') {
			playerActions.setCurrentView('winner');
		}
	}, [started, gamePhase, players, winner]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	if (!started) {
		return (
			<KmModalProvider>
				<PlayerLayout.Root>
					<PlayerLayout.Header>
						<PlayerMenu />
					</PlayerLayout.Header>

					<PlayerLayout.Main>
						{currentView === 'lobby' && <GameLobbyView />}
						{currentView === 'connections' && <ConnectionsView />}
					</PlayerLayout.Main>

					<PlayerLayout.Footer>
						<NameLabel name={name} />
					</PlayerLayout.Footer>
				</PlayerLayout.Root>
			</KmModalProvider>
		);
	}

	return (
		<PlayerLayout.Root>
			<PlayerLayout.Header />

			<PlayerLayout.Main>
				{currentView === 'question' && <QuestionView />}
				{currentView === 'eliminated' && <EliminatedView />}
				{currentView === 'winner' && <WinnerView />}
			</PlayerLayout.Main>

			<PlayerLayout.Footer>
				<NameLabel name={name} />
			</PlayerLayout.Footer>
		</PlayerLayout.Root>
	);
};

export default App;
