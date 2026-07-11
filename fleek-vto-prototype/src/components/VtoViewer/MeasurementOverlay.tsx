import type { GarmentMeasurements } from '../../types';
import styles from './VtoViewer.module.css';

interface MeasurementOverlayProps {
  measurements: GarmentMeasurements;
}

const ROWS: { key: keyof GarmentMeasurements; label: string }[] = [
  { key: 'chest', label: 'Chest' },
  { key: 'length', label: 'Length' },
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'sleeve', label: 'Sleeve' },
];

/** Garment measurements overlaid on the VTO image for the selected size. */
export default function MeasurementOverlay({ measurements }: MeasurementOverlayProps) {
  return (
    <div className={styles.overlay} aria-label="Garment measurements">
      <div className={styles.overlayTitle}>Garment measurements</div>
      {ROWS.map((row) => (
        <div key={row.key} className={styles.overlayRow}>
          <span>{row.label}</span>
          <span>{measurements[row.key]} cm</span>
        </div>
      ))}
    </div>
  );
}
