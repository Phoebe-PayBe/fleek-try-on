import { useEffect, useState } from 'react';
import { MOCK_PRODUCT } from '../../mocks/product';
import type { Product } from '../../types';
import { loadPublishedProduct } from '../../product/publishedProduct';
import StandardGallery from '../../components/StandardGallery/StandardGallery';
import VtoViewer from '../../components/VtoViewer/VtoViewer';
import ProductInfoPanel from '../../components/ProductInfoPanel/ProductInfoPanel';
import styles from './ProductDetailsPage.module.css';

export default function ProductDetailsPage() {
  // Prefer a garment published from the Supplier Studio (with live try-on
  // renders); fall back to the static mock until something is published.
  const [product, setProduct] = useState<Product>(MOCK_PRODUCT);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPublishedProduct()
      .then((live) => {
        if (!cancelled && live) {
          setProduct(live);
          setIsLive(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        Home &nbsp;&gt;&nbsp; {product.category} &nbsp;&gt;&nbsp; <span>{product.title}</span>
      </nav>

      <div className={styles.layout}>
        {/* Left column: standard gallery + VTO viewer below it */}
        <div className={styles.leftColumn}>
          <StandardGallery images={product.standardImages} />
          {/* key remounts the viewer when the live product loads so it opens on
              a cell that has a real render */}
          <VtoViewer key={product.id} product={product} live={isLive} />
        </div>

        {/* Right column: product info */}
        <div className={styles.rightColumn}>
          <ProductInfoPanel product={product} />
        </div>
      </div>
    </div>
  );
}
