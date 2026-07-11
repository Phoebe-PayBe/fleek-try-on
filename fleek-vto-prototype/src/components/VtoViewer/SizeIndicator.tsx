import type { SizeCode } from '../../types';
import { SIZE_LABELS } from '../../types';
import styles from './VtoViewer.module.css';

interface SizeIndicatorProps {
  size: SizeCode;
}

/** Bottom pill showing the currently selected size, mirroring the Google Try-On UI. */
export default function SizeIndicator({ size }: SizeIndicatorProps) {
  return (
    <div className={styles.sizeIndicator}>
      Size: <strong>{SIZE_LABELS[size]}</strong>
    </div>
  );
}
