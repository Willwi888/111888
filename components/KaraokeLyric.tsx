import React from 'react';

interface KaraokeLyricProps {
  text: string;
  startTime: number;
  endTime: number;
  currentTime: number;
  className?: string;
  highlightClassName?: string;
  style?: React.CSSProperties;
  isCurrent?: boolean;
}

const KaraokeLyric: React.FC<KaraokeLyricProps> = ({
  text,
  startTime,
  endTime,
  currentTime,
  className = '',
  highlightClassName = '',
  style = {},
  isCurrent = false,
}) => {
  const animationClass = isCurrent ? 'animate-current-lyric-glow' : '';
  
  const duration = endTime - startTime;
  const progress = duration > 0 ? Math.max(0, Math.min(1, (currentTime - startTime) / duration)) : 0;
  const clipPathValue = `inset(0 ${100 - progress * 100}% 0 0)`;

  return (
    <div className={`relative ${animationClass}`} style={style}>
      {/* Base layer: upcoming text (gray) with base styling */}
      <p className={`${className} text-gray-400`} style={style}>
        {text}
      </p>

      {/* Top layer: highlighted text, revealed with clip-path */}
      <p
        className={`${className} ${highlightClassName} absolute top-0 left-0 w-full h-full`}
        style={{
          ...style,
          clipPath: clipPathValue,
        }}
      >
        {text}
      </p>
    </div>
  );
};

export default KaraokeLyric;
