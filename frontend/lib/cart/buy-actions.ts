/**
 * Buy Now vs Add to cart helpers for product / event / membership CTAs.
 */
import type { CartLine } from '@/lib/cart/types'
import { addCartLine, clearCart, setCartOpen } from '@/lib/cart/store'

type LineInput = Omit<CartLine, 'id' | 'addedAt'> & { id?: string }
type RouterLike = { push: (href: string) => void }

/** Add line and open the bag drawer — parent can keep shopping. */
export function addToCartKeepShopping(line: LineInput) {
  addCartLine(line)
  setCartOpen(true)
}

/**
 * Express checkout: replace bag with this one item and go straight to /checkout.
 * Does not leave other items in the bag (avoids surprise multi-item charges).
 */
export function buyNowGoCheckout(line: LineInput, router: RouterLike) {
  clearCart()
  addCartLine(line)
  setCartOpen(false)
  router.push('/checkout?express=1')
}
