import { useEffect } from 'react'

export interface DetectedProduct {
  id: string
  name: string
  x: number
  y: number
}

interface PageScannerProps {
  enabled: boolean
  onProductsDetected: (products: DetectedProduct[]) => void
  onProductClicked: (product: DetectedProduct) => void
}

export function PageScanner({ enabled, onProductsDetected, onProductClicked }: PageScannerProps) {
  useEffect(() => {
    if (!enabled) return
    const detectProducts = () => {
      const productElements = document.querySelectorAll('[data-product-id]')
      const detectedProducts: DetectedProduct[] = []
      productElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        const productId = element.getAttribute('data-product-id')
        const productName = element.getAttribute('data-product-name') || productId
        if (productId) {
          detectedProducts.push({
            id: productId,
            name: productName as string,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        }
      })
      onProductsDetected(detectedProducts)
    }
    detectProducts()
    window.addEventListener('resize', detectProducts)
    window.addEventListener('scroll', detectProducts)
    return () => {
      window.removeEventListener('resize', detectProducts)
      window.removeEventListener('scroll', detectProducts)
    }
  }, [enabled, onProductsDetected])

  useEffect(() => {
    if (!enabled) return
    const handleProductClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const productCard = target.closest('[data-product-id]')
      if (productCard) {
        const rect = productCard.getBoundingClientRect()
        const productId = productCard.getAttribute('data-product-id') || ''
        const productName = productCard.getAttribute('data-product-name') || productId
        onProductClicked({
          id: productId,
          name: productName,
          x: rect.left + rect.width / 2 - 100,
          y: rect.top + rect.height / 2 + 50,
        })
      }
    }
    document.addEventListener('click', handleProductClick)
    return () => document.removeEventListener('click', handleProductClick)
  }, [enabled, onProductClicked])

  return null
}
