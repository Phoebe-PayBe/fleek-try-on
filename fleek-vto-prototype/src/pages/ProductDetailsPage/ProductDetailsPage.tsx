import { useEffect, useState } from 'react';
import { MOCK_PRODUCT } from '../../mocks/product';
import type { Product } from '../../types';
import { loadPublishedProducts } from '../../product/publishedProduct';
import StandardGallery from '../../components/StandardGallery/StandardGallery';
import VtoViewer from '../../components/VtoViewer/VtoViewer';
import ProductInfoPanel from '../../components/ProductInfoPanel/ProductInfoPanel';
import styles from './ProductDetailsPage.module.css';

export default function ProductDetailsPage() {
  // All garments published from the Supplier Studio (with live try-on
  // renders); falls back to the static mock until something is published.
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPublishedProducts()
      .then((live) => {
        if (!cancelled && live.length) {
          setProducts(live);
          setSelectedId(live[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isLive = products.length > 0;
  const product = products.find((p) => p.id === selectedId) ?? products[0] ?? MOCK_PRODUCT;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        Home &nbsp;&gt;&nbsp; {product.category} &nbsp;&gt;&nbsp; <span>{product.title}</span>
      </nav>

      {/* Marketplace rail: every published garment, click to view its listing */}
      {products.length > 1 && (
        <div className={styles.marketRail} aria-label="Published garments">
          {products.map((p) => {
            const thumb =
              (p.liveRenders && Object.values(p.liveRenders)[0]) || p.standardImages[0]?.url;
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.marketCard} ${p.id === product.id ? styles.marketCardActive : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                {thumb && <img src={thumb} alt={p.title} />}
                <span className={styles.marketCardTitle}>{p.title}</span>
                <span className={styles.marketCardPrice}>£{p.pricePerPiece.toFixed(2)}/pc</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.layout}>
        {/* Left column: standard gallery + VTO viewer below it */}
        <div className={styles.leftColumn}>
          <StandardGallery images={product.standardImages} />
          {/* key remounts the viewer when the product changes so it opens on
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
