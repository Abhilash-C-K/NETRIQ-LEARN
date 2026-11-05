import React, { useState } from 'react';

/**
 * NetriqBrand Wordmark Component
 * Renders the official NetrIQ brand heading in the exact style, font, and color scheme:
 * - 'NETRI' in deep navy blue (#001338) or crisp white on dark surfaces
 * - 'Q' in vibrant cyan-to-azure gradient (#00E5FF -> #00B4D8 -> #0077B6)
 *
 * Supports both high-res authentic graphic rendering and pure CSS/Orbitron typography fallback.
 */
export const NetriqBrand = ({
  theme = 'dark', // 'dark' | 'light'
  variant = 'graphic', // 'graphic' | 'text'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  showGlow = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-5 text-lg tracking-[0.14em]',
    md: 'h-6 text-2xl tracking-[0.16em]',
    lg: 'h-8 text-3xl tracking-[0.18em]',
    xl: 'h-10 text-4xl tracking-[0.20em]',
  };

  const isDark = theme === 'dark';
  const wordmarkSrc = isDark ? '/wordmark-light.png' : '/wordmark.png';

  if (variant === 'graphic' && !imageError) {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src={wordmarkSrc}
          alt="NETRIQ"
          className={`${sizeClasses[size].split(' ')[0]} w-auto object-contain block ${
            showGlow
              ? isDark
                ? 'filter drop-shadow-[0_0_12px_rgba(0,229,255,0.45)]'
                : 'filter drop-shadow-[0_2px_4px_rgba(0,19,56,0.15)]'
              : ''
          }`}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Typography fallback using Orbitron / Michroma font
  return (
    <div
      className={`inline-flex items-center font-brand font-black uppercase select-none ${
        sizeClasses[size].split(' ').slice(1).join(' ')
      } ${className}`}
    >
      <span
        className={
          isDark
            ? 'text-white drop-shadow-sm'
            : 'text-[#001338] drop-shadow-xs'
        }
      >
        NETRI
      </span>
      <span
        className={`bg-gradient-to-br from-[#00E5FF] via-[#00B4D8] to-[#0077B6] bg-clip-text text-transparent ${
          showGlow || isDark
            ? 'drop-shadow-[0_0_12px_rgba(0,229,255,0.65)]'
            : 'drop-shadow-xs'
        }`}
      >
        Q
      </span>
    </div>
  );
};

export default NetriqBrand;

