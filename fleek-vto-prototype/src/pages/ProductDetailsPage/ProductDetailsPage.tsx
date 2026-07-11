import { MOCK_PRODUCT } from '../../mocks/product';
import StandardGallery from '../../components/StandardGallery/StandardGallery';
import VtoViewer from '../../components/VtoViewer/VtoViewer';
import ProductInfoPanel from '../../components/ProductInfoPanel/ProductInfoPanel';
import styles from './ProductDetailsPage.module.css';

export default function ProductDetailsPage() {
  const product = MOCK_PRODUCT;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        Home &nbsp;&gt;&nbsp; {product.category} &nbsp;&gt;&nbsp; <span>{product.title}</span>
      </nav>

      <div className={styles.layout}>
        {/* Left column: standard gallery + VTO viewer below it */}
        <div className={styles.leftColumn}>
          <StandardGallery images={product.standardImages} />
          <VtoViewer product={product} />
        </div>

        {/* Right column: product info */}
        <div className={styles.rightColumn}>
          <ProductInfoPanel product={product} />
        </div>
      </div>
    </div>
  );
}
