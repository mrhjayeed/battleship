import { useSound } from '../../hooks/useSound.js';

export default function SoundToggle() {
  const { isMuted, toggleMute } = useSound();

  return (
    <button
      onClick={toggleMute}
      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
      className="p-2.5 rounded-lg bg-bg-slate border border-navy/15 hover:border-navy/35 text-navy cursor-pointer transition-all flex items-center justify-center shadow-sm"
    >
      {isMuted ? (
        // Mute icon SVG
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        // Sound waves icon SVG
        <svg className="w-5 h-5 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
        </svg>
      )}
    </button>
  );
}
