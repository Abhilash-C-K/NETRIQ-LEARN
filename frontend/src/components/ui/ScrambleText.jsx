import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const CYBER_CHARS = 'ABCDEF0123456789%#@$&!*?';

export function ScrambleText({
  text = '',
  className = '',
  scrambleSpeed = 30,
  revealDuration = 600,
  autoStart = true,
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);

  const startScramble = () => {
    if (isScrambling) return;
    setIsScrambling(true);

    const length = text.length;
    let frame = 0;
    const totalFrames = Math.max(10, Math.floor(revealDuration / scrambleSpeed));

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const revealedLength = Math.floor(progress * length);

      const scrambled = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (i < revealedLength) return text[i];
          return CYBER_CHARS[Math.floor(Math.random() * CYBER_CHARS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, scrambleSpeed);
  };

  useEffect(() => {
    if (autoStart) {
      startScramble();
    }
  }, [text]);

  return (
    <span
      onMouseEnter={startScramble}
      className={cn('inline-block font-mono cursor-default select-none', className)}
    >
      {displayText}
    </span>
  );
}
