import { useState, useCallback } from 'react'
import { DetectedProduct } from '../components/PageScanner'

export interface PageContext {
  url: string
  pageTitle: string
  visibleProducts: Array<{ id: string; name: string }>
}

interface UsePageContextReturn {
  products: DetectedProduct[]
  pageContext: PageContext
  handleProductsDetected: (products: DetectedProduct[]) => void
  handleProductClicked: (product: DetectedProduct) => void
  lastClickedProduct: DetectedProduct | null
}

export function usePageContext(): UsePageContextReturn {
  const [products, setProducts] = useState<DetectedProduct[]>([])
  const [lastClickedProduct, setLastClickedProduct] = useState<DetectedProduct | null>(null)

  const handleProductsDetected = useCallback((detected: DetectedProduct[]) => {
    setProducts(detected)
  }, [])

  const handleProductClicked = useCallback((product: DetectedProduct) => {
    setLastClickedProduct(product)
  }, [])

  const pageContext: PageContext = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    visibleProducts: products.map((p) => ({ id: p.id, name: p.name })),
  }

  return {
    products,
    pageContext,
    handleProductsDetected,
    handleProductClicked,
    lastClickedProduct,
  }
}
