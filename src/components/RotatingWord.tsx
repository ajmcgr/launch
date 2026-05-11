import { useEffect, useState } from 'react';

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

const RotatingWord = ({ words, intervalMs = 2000, className }: RotatingWordProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span key={index} className={`inline-block animate-fade-in ${className || ''}`}>
      {words[index]}
    </span>
  );
};

export default RotatingWord;
