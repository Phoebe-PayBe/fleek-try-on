import type { Product } from '../../types';
import styles from './ProductInfoPanel.module.css';

interface ProductInfoPanelProps {
  product: Product;
}

/** Right-hand column: title, price, spec rows, actions, description, seller. */
export default function ProductInfoPanel({ product }: ProductInfoPanelProps) {
  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>{product.title}</h1>

      <div className={styles.priceBlock}>
        <span className={styles.discount}>{product.discountPct}% Discount</span>
        <div className={styles.priceRow}>
          <span className={styles.price}>£{product.pricePerPiece.toFixed(2)}</span>
          <span className={styles.perPc}>/pc</span>
          <span className={styles.bundle}>(£{product.bundlePrice.toFixed(1)})</span>
          <span className={styles.original}>£{product.originalPrice.toFixed(1)}</span>
        </div>
      </div>

      <div className={styles.promo}>
        <div>
          <strong>Save £20 on your first app order</strong>
          <p>Download now and use code APPFIRSTORDER.</p>
        </div>
        <button type="button" className={styles.promoBtn}>
          Download the app
        </button>
      </div>

      <div className={styles.qtyRow}>
        <span className={styles.qtyLabel}>Quantity:</span>
        <span className={styles.qtyPill}>{product.quantity}pcs</span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.wishlist} aria-label="Add to wishlist">
          ♥
        </button>
        <button type="button" className={styles.addToCart}>
          Add to cart
        </button>
      </div>

      <dl className={styles.specs}>
        <div className={styles.specRow}>
          <dt>Department</dt>
          <dd>{product.department}</dd>
        </div>
        <div className={styles.specRow}>
          <dt>Category</dt>
          <dd className={styles.link}>{product.category}</dd>
        </div>
        <div className={styles.specRow}>
          <dt>Brands</dt>
          <dd>{product.brands.join(', ')}</dd>
        </div>
        <div className={styles.specRow}>
          <dt>Grade</dt>
          <dd>{product.grade}</dd>
        </div>
      </dl>

      <div className={styles.secondaryActions}>
        <button type="button">Make an offer</button>
        <button type="button">Message the seller</button>
      </div>

      <div className={styles.description}>
        {product.description.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className={styles.seller}>
        <img src={product.seller.avatarUrl} alt={`${product.seller.name} logo`} />
        <div>
          <strong>{product.seller.name}</strong>
          <span>{product.seller.country}</span>
        </div>
      </div>
    </div>
  );
}
