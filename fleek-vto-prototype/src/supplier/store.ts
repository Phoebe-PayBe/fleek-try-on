import type { Garment } from './types'
import { DEFAULT_MODEL } from './types'

const DB_NAME = 'fleek-supplier'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('garments')) {
        db.createObjectStore('garments', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadGarments(): Promise<Garment[]> {
  const all = await tx<Garment[]>('garments', 'readonly', (s) => s.getAll())
  // Make sure the demo garment (front.jpg denim jacket) is always available to
  // test with, even if this browser already has other supplier data.
  if (!all.some((g) => g.id === 'seed-denim-jacket')) {
    const seed = seedGarment()
    await saveGarment(seed)
    all.push(seed)
  }
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveGarment(g: Garment): Promise<void> {
  await tx('garments', 'readwrite', (s) => s.put(g))
}

export async function deleteGarment(id: string): Promise<void> {
  await tx('garments', 'readwrite', (s) => s.delete(id))
}

export async function getApiKey(): Promise<string> {
  const v = await tx<string | undefined>('settings', 'readonly', (s) => s.get('geminiApiKey'))
  return v ?? ''
}

export async function setApiKey(key: string): Promise<void> {
  await tx('settings', 'readwrite', (s) => s.put(key, 'geminiApiKey'))
}

function seedGarment(): Garment {
  return {
    id: 'seed-denim-jacket',
    name: 'Upcycled Patchwork Denim Hooded Jacket',
    category: 'Outerwear',
    sizeRange: 'S – XL',
    fabric: 'Reclaimed Levi’s denim panels, quilted lining, ribbed cuffs',
    upcycledSource: 'Vintage Levi’s denim off-cuts patch-worked into a new hooded bomber',
    wholesalePrice: '£38.00 / unit',
    quantity: '12 units',
    templateImage: '/samples/template-shirt.jpg',
    itemImage: '/standard-gallery/front.jpg',
    tryOnImage: null,
    tryOnIsDemo: false,
    tryOnRenders: {},
    modelProfile: { ...DEFAULT_MODEL },
    summary: null,
    status: 'draft',
    createdAt: Date.now(),
  }
}

export function newId(): string {
  return 'g-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
}
