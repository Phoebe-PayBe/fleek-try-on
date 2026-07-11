import styles from './VtoViewer.module.css';

interface ArrowButtonProps {
  direction: 'left' | 'right';
  position: 'top-left' | 'top-right' | 'mid-left' | 'mid-right';
  label: string;
  onClick: () => void;
}

/** A single absolutely-positioned arrow button over the VTO stage. */
export default function VtoArrowButton({ direction, position, label, onClick }: ArrowButtonProps) {
  const positionClass = {
    'top-left': styles.arrowTopLeft,
    'top-right': styles.arrowTopRight,
    'mid-left': styles.arrowMidLeft,
    'mid-right': styles.arrowMidRight,
  }[position];

  return (
    <button
      type="button"
      className={`${styles.arrow} ${positionClass}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {direction === 'left' ? '‹' : '›'}
    </button>
  );
}
