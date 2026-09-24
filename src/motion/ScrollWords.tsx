import React, { useRef } from 'react';
import { MotionValue, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

interface Line {
  text: string;
  italic?: boolean;
}

interface ScrollWordsProps {
  lines: Line[];
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
}

const Word: React.FC<{
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}> = ({ word, index, total, progress }) => {
  const opacity = useTransform(progress, [index / total, (index + 1) / total], [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block whitespace-pre">
      {word}
    </motion.span>
  );
};

/**
 * Scroll-scrubbed word reveal. Every word starts at 0.16 opacity, so the
 * sentence is faintly visible, then brightens to full in reading order,
 * tied directly to scroll position — the sentence writes itself as you scroll.
 */
export const ScrollWords: React.FC<ScrollWordsProps> = ({
  lines,
  className,
  as = 'h2',
  ...rest
}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const Tag = as as React.ElementType;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.45'],
  });

  const sentence = lines.map((l) => l.text).join(' ');

  if (reduced) {
    return (
      <Tag ref={ref} className={className} {...rest}>
        {lines.map((line, i) => (
          <span key={i} className={`block ${line.italic ? 'italic' : ''}`}>
            {line.text}
          </span>
        ))}
      </Tag>
    );
  }

  let cursor = 0;
  const total = sentence.split(' ').length;

  return (
    <Tag ref={ref} className={className} aria-label={sentence} {...rest}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className={`block ${line.italic ? 'italic' : ''}`}>
          {line.text.split(' ').map((word, wi, arr) => {
            const index = cursor;
            cursor += 1;
            return (
              <Word
                key={`${li}-${wi}`}
                word={wi === arr.length - 1 ? word : `${word} `}
                index={index}
                total={total}
                progress={scrollYProgress}
              />
            );
          })}
        </span>
      ))}
    </Tag>
  );
};
