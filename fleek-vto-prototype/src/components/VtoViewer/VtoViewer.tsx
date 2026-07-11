import { useMemo, useState } from 'react';
import type { Product, Demographic, SizeCode } from '../../types';
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

export default function VtoViewer({ product, live = false }: VtoViewerProps) {
  if (live && product.liveRenders && Object.keys(product.liveRenders).length > 0) {
    return <LiveVtoViewer product={product} />;
  }
  return <MockVtoViewer product={product} live={live} />;
}

const GENDER_ORDER = ['Female', 'Male'];

/**
 * Live viewer driven purely by the renders the supplier actually published.
 * Combinations without a render are unreachable: sizes show a cross and are
 * disabled, demographics with no renders are skipped by the arrows, and the
 * gender toggle only appears when both genders have renders.
 */
function LiveVtoViewer({ product }: { product: Product }) {
  const renders = product.liveRenders!;

  const has = (demo: Demographic, gender: string, size: SizeCode) =>
    Boolean(renders[`${demo}|${gender}|${size}`]);

  const genders = useMemo(
    () => GENDER_ORDER.filter((g) => Object.keys(renders).some((k) => k.split('|')[1] === g)),
    [renders],
  );

  const demosFor = (gender: string) =>
    product.availableDemographics.filter((d) =>
      product.availableSizes.some((s) => has(d, gender, s)),
    );

  const sizesFor = (demo: Demographic, gender: string) =>
    product.availableSizes.filter((s) => has(demo, gender, s));

  // initial selection: first filled combination
  const first = useMemo(() => {
    for (const g of genders)
      for (const d of demosFor(g))
        for (const s of sizesFor(d, g)) return { g, d, s };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renders]);

  const [gender, setGender] = useState(first?.g ?? 'Female');
  const [demo, setDemo] = useState<Demographic>(first?.d ?? product.availableDemographics[0]);
  const [size, setSize] = useState<SizeCode>(first?.s ?? product.availableSizes[0]);

  if (!first) return null;

  const demos = demosFor(gender);
  const sizes = sizesFor(demo, gender);

  /** Keep demographic/size valid when the gender changes. */
  function switchGender(nextGender: string) {
    const ds = demosFor(nextGender);
    const d = ds.includes(demo) ? demo : ds[0];
    const ss = sizesFor(d, nextGender);
    setGender(nextGender);
    setDemo(d);
    setSize(ss.includes(size) ? size : ss[0]);
  }

  function stepDemo(delta: number) {
    const i = demos.indexOf(demo);
    const d = demos[(i + delta + demos.length) % demos.length];
    setDemo(d);
    const ss = sizesFor(d, gender);
    if (!ss.includes(size)) setSize(ss[0]);
  }

  function stepSize(delta: number) {
    const i = sizes.indexOf(size);
    setSize(sizes[(i + delta + sizes.length) % sizes.length]);
  }

  const imageUrl = renders[`${demo}|${gender}|${size}`];
  const measurements = product.vtoMatrix[demo][size].measurements;

  return (
    <section className={styles.section} aria-label="Virtual try-on">
      <div className={styles.header}>
        <h2 className={styles.heading}>Virtual Try-On</h2>
        <div className={styles.headerRight}>
          {genders.length > 1 && (
            <button
              type="button"
              className={styles.genderToggle}
              onClick={() => switchGender(gender === 'Female' ? 'Male' : 'Female')}
              title="Toggle model"
            >
              {gender === 'Female' ? '♀ Female' : '♂ Male'} ⇄
            </button>
          )}
          <span className={styles.badge}>Live · published render</span>
        </div>
      </div>

      <div className={styles.stage}>
        <img
          className={styles.stageImage}
          src={imageUrl}
          alt={`${DEMOGRAPHIC_LABELS[demo]} ${gender.toLowerCase()} model wearing size ${size}`}
        />

        {/* Top: demographic toggle — only demographics with renders */}
        <div className={styles.demographicLabel}>
          {DEMOGRAPHIC_LABELS[demo]}
          {genders.length > 1 ? ` · ${gender}` : ''}
        </div>
        {demos.length > 1 && (
          <>
            <VtoArrowButton direction="left" position="top-left" label="Previous model demographic" onClick={() => stepDemo(-1)} />
            <VtoArrowButton direction="right" position="top-right" label="Next model demographic" onClick={() => stepDemo(1)} />
          </>
        )}

        {/* Middle sides: size toggle — skips sizes without a render */}
        {sizes.length > 1 && (
          <>
            <VtoArrowButton direction="left" position="mid-left" label="Previous size" onClick={() => stepSize(-1)} />
            <VtoArrowButton direction="right" position="mid-right" label="Next size" onClick={() => stepSize(1)} />
          </>
        )}

        <MeasurementOverlay measurements={measurements} />
        <SizeIndicator size={size} />
      </div>

      {/* Size quick-select: sizes without a render are crossed out */}
      <div className={styles.sizeRow}>
        {product.availableSizes.map((s) => {
          const available = has(demo, gender, s);
          return (
            <button
              key={s}
              type="button"
              className={[
                styles.sizeChip,
                s === size ? styles.sizeChipActive : '',
                available ? '' : styles.sizeChipDisabled,
              ].join(' ')}
              onClick={() => available && setSize(s)}
              disabled={!available}
              title={available ? `Size ${s}` : `No render for size ${s} yet`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Prototype viewer over the mock matrix (original behaviour).
 *  - Top arrows toggle the model demographic.
 *  - Middle side arrows toggle the garment size.
 *  - Measurements overlay + bottom size indicator reflect the current size.
 */
function MockVtoViewer({ product, live }: { product: Product; live: boolean }) {
  const vto = useVtoSelection(product.availableDemographics, product.availableSizes, product.vtoMatrix);

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

        <div className={styles.demographicLabel}>{DEMOGRAPHIC_LABELS[vto.demographic]}</div>
        <VtoArrowButton direction="left" position="top-left" label="Previous model demographic" onClick={vto.prevDemographic} />
        <VtoArrowButton direction="right" position="top-right" label="Next model demographic" onClick={vto.nextDemographic} />
        <VtoArrowButton direction="left" position="mid-left" label="Previous size" onClick={vto.prevSize} />
        <VtoArrowButton direction="right" position="mid-right" label="Next size" onClick={vto.nextSize} />

        <MeasurementOverlay measurements={vto.currentVariant.measurements} />
        <SizeIndicator size={vto.size} />
      </div>

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
