import type { Product } from '../../types';
import { DEMOGRAPHIC_LABELS } from '../../types';
import { useVtoSelection } from '../../hooks/useVtoSelection';
import VtoArrowButton from './VtoControls';
import MeasurementOverlay from './MeasurementOverlay';
import SizeIndicator from './SizeIndicator';
import styles from './VtoViewer.module.css';

interface VtoViewerProps {
  product: Product;
  /** True when the renders come from a garment published in the Supplier Studio. */
  live?: boolean;
}

/**
 * Interactive Virtual Try-On viewer.
 *  - Top arrows toggle the model demographic.
 *  - Middle side arrows toggle the garment size.
 *  - Image reflects the demographic + size combination.
 *  - Measurements overlay + bottom size indicator reflect the current size.
 * All data is pre-set mock data; nothing is generated live.
 */
export default function VtoViewer({ product, live = false }: VtoViewerProps) {
  // When showing live published renders, open on the first demographic + size
  // that actually has a generated render (data URL) rather than a placeholder,
  // so the buyer sees a real try-on immediately.
  const initial = (() => {
    if (!live) return {};
    for (let d = 0; d < product.availableDemographics.length; d++) {
      for (let s = 0; s < product.availableSizes.length; s++) {
        const url = product.vtoMatrix[product.availableDemographics[d]][product.availableSizes[s]].imageUrl;
        if (url.startsWith('data:')) return { demographicIndex: d, sizeIndex: s };
      }
    }
    return {};
  })();

  const vto = useVtoSelection(
    product.availableDemographics,
    product.availableSizes,
    product.vtoMatrix,
    initial,
  );

  return (
    <section className={styles.section} aria-label="Virtual try-on">
      <div className={styles.header}>
        <h2 className={styles.heading}>Virtual Try-On</h2>
        <span className={styles.badge}>{live ? 'Live · published render' : 'Prototype · mock data'}</span>
      </div>

      <div className={styles.stage}>
        <img
          className={styles.stageImage}
          src={vto.currentVariant.imageUrl}
          alt={`${DEMOGRAPHIC_LABELS[vto.demographic]} model wearing size ${vto.size}`}
        />

        {/* Top: demographic toggle */}
        <div className={styles.demographicLabel}>{DEMOGRAPHIC_LABELS[vto.demographic]}</div>
        <VtoArrowButton
          direction="left"
          position="top-left"
          label="Previous model demographic"
          onClick={vto.prevDemographic}
        />
        <VtoArrowButton
          direction="right"
          position="top-right"
          label="Next model demographic"
          onClick={vto.nextDemographic}
        />

        {/* Middle sides: size toggle */}
        <VtoArrowButton
          direction="left"
          position="mid-left"
          label="Previous size"
          onClick={vto.prevSize}
        />
        <VtoArrowButton
          direction="right"
          position="mid-right"
          label="Next size"
          onClick={vto.nextSize}
        />

        <MeasurementOverlay measurements={vto.currentVariant.measurements} />
        <SizeIndicator size={vto.size} />
      </div>

      {/* Size quick-select row (mirrors indexed sizes) */}
      <div className={styles.sizeRow}>
        {product.availableSizes.map((size, index) => (
          <button
            key={size}
            type="button"
            className={`${styles.sizeChip} ${index === vto.sizeIndex ? styles.sizeChipActive : ''}`}
            onClick={() => vto.setSizeIndex(index)}
          >
            {size}
          </button>
        ))}
      </div>
    </section>
  );
}
