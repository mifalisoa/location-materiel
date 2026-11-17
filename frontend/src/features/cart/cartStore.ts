import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartArticle = {
  id: number
  categorieId: number
  nom: string
  description: string | null
  imageUrl: string | null
  prixJour: number
  caution: number
  quantiteTotale: number
  categorie?: { id: number; nom: string; slug: string }
}
export type CartLine = { article: CartArticle; quantite: number }

type CartStore = {
  cart: CartLine[]
  add: (article: CartArticle, limit: number) => void
  changeQuantity: (id: number, amount: number, limit: number) => void
  clear: () => void
}

export const useCartStore = create<CartStore>()(persist((set) => ({
  cart: [],
  add: (article, limit) => set((state) => {
    const current = state.cart.find((line) => line.article.id === article.id)
    if (current) {
      if (current.quantite >= limit) return state
      return { cart: state.cart.map((line) => line.article.id === article.id ? { ...line, quantite: line.quantite + 1 } : line) }
    }
    return limit < 1 ? state : { cart: [...state.cart, { article, quantite: 1 }] }
  }),
  changeQuantity: (id, amount, limit) => set((state) => ({ cart: state.cart.flatMap((line) => {
    if (line.article.id !== id) return [line]
    const next = line.quantite + amount
    if (next < 1) return []
    return [{ ...line, quantite: Math.min(next, limit) }]
  }) })),
  clear: () => set({ cart: [] }),
}), { name: 'location-cart', storage: createJSONStorage(() => localStorage) }))
