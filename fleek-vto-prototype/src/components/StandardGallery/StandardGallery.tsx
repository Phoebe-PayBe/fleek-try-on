import { useState, type SyntheticEvent } from 'react';
import type { ProductImage } from '../../types';
import styles from './StandardGallery.module.css';

interface StandardGalleryProps {
  images: ProductImage[];
}

/** The 3 standard product images with a main view + thumbnail strip. */
export default function StandardGallery({ images }: StandardGalleryProps) {
  const [activeId, setActiveId] = useState(images[0]?.id);
  const active = images.find((img) => img.id === activeId) ?? images[0];
  const fallbackSrc = 'https://placehold.co/600x600/cccccc/333333?text=Missing+Image';

  const handleImageError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.currentTarget;
    if (target.src !== fallbackSrc) {
      target.src = fallbackSrc;
    }
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.thumbs}>
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            className={`${styles.thumb} ${img.id === active.id ? styles.thumbActive : ''}`}
            onClick={() => setActiveId(img.id)}
            aria-label={`View ${img.alt}`}
          >
            <img src={img.url} alt={img.alt} onError={handleImageError} />
          </button>
        ))}
      </div>
      <div className={styles.main}>
        <img src={active.url} alt={active.alt} onError={handleImageError} />
      </div>
    </div>
  );
}
