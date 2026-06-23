import { useState, useEffect, useRef } from 'react';

// Singletons for audio objects so they don't get recreated or duplicate on re-renders
const sounds = {
  hit: new Audio('/sounds/hit.mp3'),
  miss: new Audio('/sounds/miss.mp3'),
  victory: new Audio('/sounds/victory.mp3'),
  defeat: new Audio('/sounds/defeat.mp3'),
  music: new Audio('/sounds/background_music.mp3'),
};

// Configure settings
sounds.music.loop = true;
sounds.music.volume = 0.2;

export const useSound = () => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('battleship_muted') === 'true';
  });

  const fadeIntervalRef = useRef(null);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('battleship_muted', next.toString());
      return next;
    });
  };

  const playSFX = (type) => {
    if (isMuted) return;
    const audio = sounds[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((err) => console.log('Audio play blocked:', err));
    }
  };

  const startMusic = () => {
    if (isMuted) return;
    
    // Stop any active fading
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    sounds.music.volume = 0;
    sounds.music.play()
      .then(() => {
        // Fade in
        fadeIntervalRef.current = setInterval(() => {
          if (sounds.music.volume < 0.2) {
            sounds.music.volume = Math.min(0.2, sounds.music.volume + 0.02);
          } else {
            clearInterval(fadeIntervalRef.current);
          }
        }, 100);
      })
      .catch((err) => console.log('BGM play blocked:', err));
  };

  const stopMusic = () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    // Fade out
    fadeIntervalRef.current = setInterval(() => {
      if (sounds.music.volume > 0.02) {
        sounds.music.volume = Math.max(0, sounds.music.volume - 0.02);
      } else {
        clearInterval(fadeIntervalRef.current);
        sounds.music.pause();
      }
    }, 100);
  };

  // Sync mute state with background music
  useEffect(() => {
    if (isMuted) {
      sounds.music.pause();
    } else {
      // Play if not already playing
      if (sounds.music.paused) {
        sounds.music.play().catch(() => {});
      }
      sounds.music.volume = 0.2;
    }
  }, [isMuted]);

  // Page Visibility API listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause music when tab hidden
        sounds.music.pause();
      } else {
        // Resume music if visible and not muted
        if (!isMuted && sounds.music.paused) {
          sounds.music.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMuted]);

  return {
    isMuted,
    toggleMute,
    playSFX,
    startMusic,
    stopMusic,
  };
};
