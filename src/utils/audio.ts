import { config } from '@/config';

// Audio utility functions
export const playSound = (soundUrl: string, volume: number = 0.5) => {
	if (!config.enableAudio || !soundUrl) return;

	try {
		const audio = new Audio(soundUrl);
		audio.volume = Math.max(0, Math.min(1, volume));
		audio.play().catch(console.warn); // Ignore autoplay policy errors
	} catch (error) {
		console.warn('Failed to play sound:', error);
	}
};

// Fallback sounds using Web Audio API for simple tones
export const playTone = (
	frequency: number,
	duration: number = 200,
	volume: number = 0.3
) => {
	if (!config.enableAudio) return;

	try {
		const audioContext = new (window.AudioContext ||
			(window as any).webkitAudioContext)();
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
		oscillator.type = 'sine';

		gainNode.gain.setValueAtTime(0, audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(
			volume,
			audioContext.currentTime + 0.01
		);
		gainNode.gain.linearRampToValueAtTime(
			0,
			audioContext.currentTime + duration / 1000
		);

		oscillator.start(audioContext.currentTime);
		oscillator.stop(audioContext.currentTime + duration / 1000);
	} catch (error) {
		console.warn('Failed to play tone:', error);
	}
};

// Pre-defined sound effects
export const soundEffects = {
	correctAnswer: () => {
		if (config.correctAnswerSoundUrl) {
			playSound(config.correctAnswerSoundUrl);
		} else {
			// Fallback: Happy ascending tone sequence
			playTone(523, 150); // C5
			setTimeout(() => playTone(659, 150), 100); // E5
			setTimeout(() => playTone(784, 200), 200); // G5
		}
	},

	elimination: () => {
		if (config.eliminationSoundUrl) {
			playSound(config.eliminationSoundUrl);
		} else {
			// Fallback: Sad descending tone
			playTone(392, 300, 0.4); // G4
			setTimeout(() => playTone(330, 400, 0.4), 200); // E4
		}
	}
};
