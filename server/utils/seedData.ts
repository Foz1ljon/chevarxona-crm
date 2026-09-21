import type { Types } from 'mongoose'

type FieldSeed = { key: string, label: string, unit?: string, required?: boolean, hint?: string }

const suitFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'hips', label: 'Son aylanasi' },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'jacket_length', label: 'Pidjak uzunligi', required: true },
  { key: 'neck', label: 'Bo‘yin aylanasi' },
  { key: 'bicep', label: 'Yelka (bicep) aylanasi' },
  { key: 'trouser_waist', label: 'Shim beli', required: true },
  { key: 'inseam', label: 'Ichki chok uzunligi', required: true },
  { key: 'thigh', label: 'Son aylanasi (shim)' },
  { key: 'cuff', label: 'Shim etagi kengligi' }
]

const shirtFields: FieldSeed[] = [
  { key: 'neck', label: 'Bo‘yin aylanasi', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'waist', label: 'Bel aylanasi' },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'shirt_length', label: 'Ko‘ylak uzunligi', required: true },
  { key: 'bicep', label: 'Yelka (bicep) aylanasi' },
  { key: 'cuff', label: 'Manjet', hint: 'Bilak aylanasi + erkinlik' }
]

const trouserFields: FieldSeed[] = [
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'hips', label: 'Son aylanasi', required: true },
  { key: 'inseam', label: 'Ichki chok uzunligi', required: true },
  { key: 'outseam', label: 'Tashqi chok uzunligi', required: true },
  { key: 'thigh', label: 'Son aylanasi', required: true },
  { key: 'knee', label: 'Tizza aylanasi' },
  { key: 'cuff', label: 'Etak kengligi', required: true },
  { key: 'crotch', label: 'O‘rindiq chuqurligi' }
]

const dressFields: FieldSeed[] = [
  { key: 'bust', label: 'Ko‘krak aylanasi', required: true },
  { key: 'under_bust', label: 'Ko‘krak osti aylanasi' },
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'hips', label: 'Son aylanasi', required: true },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi' },
  { key: 'dress_length', label: 'Ko‘ylak uzunligi', required: true },
  { key: 'back_width', label: 'Orqa kengligi' },
  { key: 'bust_point', label: 'Ko‘krak markazi' }
]

const coatFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi (ustki kiyim)', required: true },
  { key: 'waist', label: 'Bel aylanasi' },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'coat_length', label: 'Palto uzunligi', required: true },
  { key: 'neck', label: 'Bo‘yin aylanasi' }
]

const chapanFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'full_length', label: 'Umumiy uzunligi', required: true },
  { key: 'hem_width', label: 'Etak kengligi' }
]

const summerFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'shoulder', label: 'Yelka kengligi', required: true },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'jacket_length', label: 'Kurtka uzunligi', required: true },
  { key: 'trouser_waist', label: 'Shim beli', required: true },
  { key: 'inseam', label: 'Ichki chok uzunligi', required: true }
]

const tracksuitFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'hips', label: 'Son aylanasi' },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true },
  { key: 'inseam', label: 'Ichki chok uzunligi', required: true },
  { key: 'outseam', label: 'Tashqi chok uzunligi', required: true }
]

const kidsFields: FieldSeed[] = [
  { key: 'height', label: 'Bo‘y', required: true },
  { key: 'chest', label: 'Ko‘krak aylanasi', required: true },
  { key: 'waist', label: 'Bel aylanasi', required: true },
  { key: 'hips', label: 'Son aylanasi' },
  { key: 'shoulder', label: 'Yelka kengligi' },
  { key: 'sleeve', label: 'Yeng uzunligi', required: true }
]

function withDefaults(fields: FieldSeed[]) {
  return fields.map((field, index) => ({
    key: field.key,
    label: field.label,
    unit: field.unit ?? 'cm',
    required: field.required ?? false,
    min: 0,
    max: 400,
    hint: field.hint ?? '',
    order: index
  }))
}

export const GARMENT_CATEGORY_SEED = [
  {
    name: 'Ikki qismli kostyum', slug: 'two-piece-suit', icon: 'i-lucide-shirt',
    description: 'Pidjak va shim — to‘liq yoki yarim kanvasli klassik erkaklar kostyumi.',
    basePrice: 2_500_000, estimatedDays: 14, sortOrder: 1,
    measurementFields: withDefaults(suitFields),
    bom: [
      { type: 'FABRIC', match: 'WOOL', label: 'Asosiy kostyum matosi', quantity: 3.4, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Pidjak astari', quantity: 2, unit: 'm', wastage: 5 },
      { type: 'ACCESSORY', match: 'INTERLINING', label: 'Dublerin', quantity: 1.2, unit: 'm', wastage: 5 },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Kostyum tugmalari', quantity: 10, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'ZIPPER', label: 'Shim zamoki', quantity: 1, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 2, unit: 'pcs' }
    ]
  },
  {
    name: 'Klassik ko‘ylak', slug: 'dress-shirt', icon: 'i-lucide-shirt',
    description: 'Qotirilgan yoqa va manjetli, yopishqoq yoki yengil bichimli ko‘ylak.',
    basePrice: 450_000, estimatedDays: 5, sortOrder: 2,
    measurementFields: withDefaults(shirtFields),
    bom: [
      { type: 'FABRIC', match: 'COTTON', label: 'Ko‘ylak matosi', quantity: 2.2, unit: 'm', wastage: 7 },
      { type: 'ACCESSORY', match: 'INTERLINING', label: 'Yoqa va manjet dublerini', quantity: 0.4, unit: 'm' },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Ko‘ylak tugmalari', quantity: 12, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 1, unit: 'spool' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Shim', slug: 'trousers', icon: 'i-lucide-rectangle-vertical',
    description: 'Silliq yoki burmali, astarli belbog‘li erkaklar shimi.',
    basePrice: 700_000, estimatedDays: 6, sortOrder: 3,
    measurementFields: withDefaults(trouserFields),
    bom: [
      { type: 'FABRIC', match: 'WOOL', label: 'Shim matosi', quantity: 1.5, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'ZIPPER', label: 'Shim zamoki', quantity: 1, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Belbog‘ tugmasi', quantity: 2, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 1, unit: 'spool' },
      { type: 'ACCESSORY', match: 'INTERLINING', label: 'Belbog‘ dublerini', quantity: 0.3, unit: 'm' }
    ]
  },
  {
    name: 'Kechki ko‘ylak', slug: 'evening-dress', icon: 'i-lucide-venus',
    description: 'Individual o‘lchovda tikilgan kechki yoki tantanali ayollar ko‘ylagi.',
    basePrice: 3_200_000, estimatedDays: 18, sortOrder: 4,
    measurementFields: withDefaults(dressFields),
    bom: [
      { type: 'FABRIC', match: 'SILK', label: 'Ustki mato', quantity: 4, unit: 'm', wastage: 12 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Ko‘ylak astari', quantity: 3, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'ZIPPER', label: 'Ko‘rinmas zamok', quantity: 1, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'HOOK', label: 'Ilgak va halqa', quantity: 2, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'BAG', label: 'Kiyim qopi', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Palto', slug: 'overcoat', icon: 'i-lucide-shirt',
    description: 'Jun palto, to‘liq astarli, bir yoki ikki qatorli.',
    basePrice: 3_800_000, estimatedDays: 21, sortOrder: 5,
    measurementFields: withDefaults(coatFields),
    bom: [
      { type: 'FABRIC', match: 'WOOL', label: 'Palto matosi', quantity: 3.8, unit: 'm', wastage: 10 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Palto astari', quantity: 3, unit: 'm', wastage: 6 },
      { type: 'ACCESSORY', match: 'INTERLINING', label: 'Ko‘krak kanvasi', quantity: 1.5, unit: 'm' },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Palto tugmalari', quantity: 8, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'HANGER', label: 'Yog‘och veshalka', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Chapan (an’anaviy)', slug: 'chapan', icon: 'i-lucide-crown',
    description: 'Adras yoki atlasdan tikilgan an’anaviy qavilgan to‘n.',
    basePrice: 1_400_000, estimatedDays: 10, sortOrder: 6,
    measurementFields: withDefaults(chapanFields),
    bom: [
      { type: 'FABRIC', match: 'ADRAS', label: 'Adras / atlas matosi', quantity: 3.2, unit: 'm', wastage: 10 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Paxta astar', quantity: 3, unit: 'm', wastage: 6 },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Atlas ko‘ylak', slug: 'atlas-dress', icon: 'i-lucide-crown',
    description: 'Marg‘ilon atlasidan tikilgan milliy uslubdagi ayollar ko‘ylagi.',
    basePrice: 1_900_000, estimatedDays: 12, sortOrder: 7,
    measurementFields: withDefaults(dressFields),
    bom: [
      { type: 'FABRIC', match: 'ATLAS', label: 'Atlas matosi', quantity: 3, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Ko‘ylak astari', quantity: 2, unit: 'm', wastage: 6 },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Yozgi kostyum', slug: 'summer-suit', icon: 'i-lucide-shirt',
    description: 'Zig‘ir yoki paxtadan tikilgan yengil yozgi kostyum.',
    basePrice: 2_100_000, estimatedDays: 12, sortOrder: 8,
    measurementFields: withDefaults(summerFields),
    bom: [
      { type: 'FABRIC', match: 'LINEN', label: 'Kostyum zig‘iri', quantity: 3, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'LINING', label: 'Yengil astar', quantity: 2, unit: 'm', wastage: 5 },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Kostyum tugmalari', quantity: 8, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'INTERLINING', label: 'Dublerin', quantity: 1, unit: 'm' }
    ]
  },
  {
    name: 'Sport kostyum', slug: 'tracksuit', icon: 'i-lucide-shirt',
    description: 'Triko yoki flisdan tikilgan qulay sport kiyimi.',
    basePrice: 850_000, estimatedDays: 7, sortOrder: 9,
    measurementFields: withDefaults(tracksuitFields),
    bom: [
      { type: 'FABRIC', match: 'POLYESTER', label: 'Flis / triko matosi', quantity: 2.2, unit: 'm', wastage: 6 },
      { type: 'ACCESSORY', match: 'ZIPPER', label: 'Kurtka zamoki', quantity: 1, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'ELASTIC', label: 'Bel va manjet rezinkasi', quantity: 1.2, unit: 'm' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 2, unit: 'spool' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 1, unit: 'pcs' }
    ]
  },
  {
    name: 'Bolalar kostyumi', slug: 'kids-suit', icon: 'i-lucide-shirt',
    description: 'O‘smirlar va bolalar uchun milliy yoki klassik kostyum.',
    basePrice: 600_000, estimatedDays: 6, sortOrder: 10,
    measurementFields: withDefaults(kidsFields),
    bom: [
      { type: 'FABRIC', match: 'COTTON', label: 'Bolalar matosi', quantity: 1.8, unit: 'm', wastage: 8 },
      { type: 'ACCESSORY', match: 'BUTTON', label: 'Tugmalar', quantity: 6, unit: 'pcs' },
      { type: 'ACCESSORY', match: 'THREAD', label: 'Mos rangdagi ip', quantity: 1, unit: 'spool' },
      { type: 'ACCESSORY', match: 'LABEL', label: 'Brend yorlig‘i', quantity: 1, unit: 'pcs' }
    ]
  }
] as const

export const FABRIC_SEED = [
  { name: 'Super 130s grafit jun', sku: 'FB-WOOL-001', fabricType: 'WOOL', color: 'Grafit', colorHex: '#374151', pattern: 'Oddiy', stockQty: 120, minThreshold: 20, costPerUnit: 320_000, supplier: 'Vitale Barberis', location: 'A1-03' },
  { name: 'To‘q ko‘k tvil jun', sku: 'FB-WOOL-002', fabricType: 'WOOL', color: 'To‘q ko‘k', colorHex: '#1e3a8a', pattern: 'Tvil', stockQty: 86, minThreshold: 20, costPerUnit: 280_000, supplier: 'Reda', location: 'A1-04' },
  { name: 'Kulrang glen-chek jun', sku: 'FB-WOOL-003', fabricType: 'WOOL', color: 'Kulrang', colorHex: '#6b7280', pattern: 'Glen-chek', stockQty: 14, minThreshold: 18, costPerUnit: 345_000, supplier: 'Loro Piana', location: 'A1-05' },
  { name: 'Jigarrang tvid jun', sku: 'FB-WOOL-004', fabricType: 'WOOL', color: 'Jigarrang', colorHex: '#78350f', pattern: 'Tvid', stockQty: 64, minThreshold: 20, costPerUnit: 295_000, supplier: 'Holland & Sherry', location: 'A1-06' },
  { name: 'Oq poplin paxta', sku: 'FB-COT-001', fabricType: 'COTTON', color: 'Oq', colorHex: '#f8fafc', pattern: 'Poplin', stockQty: 210, minThreshold: 40, costPerUnit: 95_000, supplier: 'Thomas Mason', location: 'B2-01' },
  { name: 'Osmonsiyo oksford paxta', sku: 'FB-COT-002', fabricType: 'COTTON', color: 'Osmonsiyo', colorHex: '#7dd3fc', pattern: 'Oksford', stockQty: 155, minThreshold: 40, costPerUnit: 88_000, supplier: 'Albini', location: 'B2-02' },
  { name: 'Mint yashil paxta', sku: 'FB-COT-003', fabricType: 'COTTON', color: 'Mint', colorHex: '#6ee7b7', pattern: 'Oddiy', stockQty: 132, minThreshold: 30, costPerUnit: 76_000, supplier: 'Albini', location: 'B2-03' },
  { name: 'Fil suyagi shoyi sharmez', sku: 'FB-SILK-001', fabricType: 'SILK', color: 'Fil suyagi', colorHex: '#fef3c7', pattern: 'Sharmez', stockQty: 42, minThreshold: 15, costPerUnit: 410_000, supplier: 'Taroni', location: 'C1-01' },
  { name: 'Zumrad shoyi satin', sku: 'FB-SILK-002', fabricType: 'SILK', color: 'Zumrad', colorHex: '#047857', pattern: 'Satin', stockQty: 9, minThreshold: 12, costPerUnit: 465_000, supplier: 'Taroni', location: 'C1-02' },
  { name: 'Marg‘ilon adrasi — klassik', sku: 'FB-ADR-001', fabricType: 'ADRAS', color: 'Ko‘p rangli', colorHex: '#b91c1c', pattern: 'Ikat', stockQty: 68, minThreshold: 15, costPerUnit: 155_000, supplier: 'Marg‘ilon', location: 'D1-01' },
  { name: 'Xon-atlas oltin', sku: 'FB-ATL-001', fabricType: 'ATLAS', color: 'Oltin', colorHex: '#ca8a04', pattern: 'Ikat', stockQty: 51, minThreshold: 15, costPerUnit: 168_000, supplier: 'Yodgorlik', location: 'D1-02' },
  { name: 'Qora zig‘ir aralashmasi', sku: 'FB-LIN-001', fabricType: 'LINEN', color: 'Qora', colorHex: '#0f172a', pattern: 'Oddiy', stockQty: 73, minThreshold: 20, costPerUnit: 132_000, supplier: 'Solbiati', location: 'B3-01' },
  { name: 'Tabiiy zig‘ir', sku: 'FB-LIN-002', fabricType: 'LINEN', color: 'Tabiiy', colorHex: '#d6bfa3', pattern: 'Oddiy', stockQty: 96, minThreshold: 25, costPerUnit: 118_000, supplier: 'Solbiati', location: 'B3-02' },
  { name: 'Bordo baxmal', sku: 'FB-VEL-001', fabricType: 'VELVET', color: 'Bordo', colorHex: '#7f1d1d', pattern: 'Oddiy', stockQty: 38, minThreshold: 12, costPerUnit: 245_000, supplier: 'Beccaria', location: 'C2-01' },
  { name: 'Krem kashmir', sku: 'FB-CSH-001', fabricType: 'CASHMERE', color: 'Krem', colorHex: '#f5f5f4', pattern: 'Oddiy', stockQty: 26, minThreshold: 10, costPerUnit: 690_000, supplier: 'Loro Piana', location: 'C2-02' },
  { name: 'Qora satin', sku: 'FB-SAT-001', fabricType: 'SATIN', color: 'Qora', colorHex: '#111827', pattern: 'Satin', stockQty: 84, minThreshold: 20, costPerUnit: 142_000, supplier: 'Taroni', location: 'C2-03' },
  { name: 'Moviy denim', sku: 'FB-DEN-001', fabricType: 'DENIM', color: 'Moviy', colorHex: '#1d4ed8', pattern: 'Tvig', stockQty: 118, minThreshold: 30, costPerUnit: 98_000, supplier: 'Candiani', location: 'B4-01' },
  { name: 'Kulrang flis', sku: 'FB-POL-001', fabricType: 'POLYESTER', color: 'Kulrang', colorHex: '#9ca3af', pattern: 'Triko', stockQty: 164, minThreshold: 40, costPerUnit: 62_000, supplier: 'Pontetorto', location: 'B4-02' }
] as const

export const ACCESSORY_SEED = [
  { name: 'Shox tugma 20 mm — to‘q jigarrang', sku: 'AC-BTN-001', category: 'BUTTON', unit: 'pcs', color: 'To‘q jigarrang', size: '20mm', stockQty: 1840, minThreshold: 300, costPerUnit: 9_000 },
  { name: 'Sedef tugma 11 mm', sku: 'AC-BTN-002', category: 'BUTTON', unit: 'pcs', color: 'Oq', size: '11mm', stockQty: 2600, minThreshold: 400, costPerUnit: 4_500 },
  { name: 'Korozo tugma 15 mm — qora', sku: 'AC-BTN-003', category: 'BUTTON', unit: 'pcs', color: 'Qora', size: '15mm', stockQty: 210, minThreshold: 300, costPerUnit: 6_200 },
  { name: 'Metall tugma 18 mm — kumush', sku: 'AC-BTN-004', category: 'BUTTON', unit: 'pcs', color: 'Kumush', size: '18mm', stockQty: 640, minThreshold: 200, costPerUnit: 11_500 },
  { name: 'YKK shim zamoki 18 sm', sku: 'AC-ZIP-001', category: 'ZIPPER', unit: 'pcs', color: 'Qora', size: '18cm', stockQty: 430, minThreshold: 100, costPerUnit: 12_000 },
  { name: 'YKK ko‘rinmas zamok 60 sm', sku: 'AC-ZIP-002', category: 'ZIPPER', unit: 'pcs', color: 'Aralash', size: '60cm', stockQty: 95, minThreshold: 60, costPerUnit: 18_000 },
  { name: 'Ritsaga zamok — yozuvli', sku: 'AC-ZIP-003', category: 'ZIPPER', unit: 'pcs', color: 'Qora', size: '55cm', stockQty: 180, minThreshold: 60, costPerUnit: 24_000 },
  { name: 'Poliester ip 120 — qora', sku: 'AC-THR-001', category: 'THREAD', unit: 'spool', color: 'Qora', stockQty: 320, minThreshold: 80, costPerUnit: 15_000 },
  { name: 'Poliester ip 120 — oq', sku: 'AC-THR-002', category: 'THREAD', unit: 'spool', color: 'Oq', stockQty: 285, minThreshold: 80, costPerUnit: 15_000 },
  { name: 'Shoyi ip — aralash ranglar', sku: 'AC-THR-003', category: 'THREAD', unit: 'spool', color: 'Aralash', stockQty: 62, minThreshold: 80, costPerUnit: 26_000 },
  { name: 'Dublerin (o‘rtacha) — oq', sku: 'AC-INT-001', category: 'INTERLINING', unit: 'm', color: 'Oq', stockQty: 240, minThreshold: 50, costPerUnit: 22_000 },
  { name: 'Ot juni ko‘krak kanvasi', sku: 'AC-INT-002', category: 'INTERLINING', unit: 'm', color: 'Tabiiy', stockQty: 88, minThreshold: 30, costPerUnit: 74_000 },
  { name: 'Bemberg astar — grafit', sku: 'AC-LIN-001', category: 'LINING', unit: 'm', color: 'Grafit', stockQty: 190, minThreshold: 50, costPerUnit: 46_000 },
  { name: 'Bemberg astar — fil suyagi', sku: 'AC-LIN-002', category: 'LINING', unit: 'm', color: 'Fil suyagi', stockQty: 165, minThreshold: 50, costPerUnit: 46_000 },
  { name: 'Bel rezinkasi 40 mm', sku: 'AC-ELS-001', category: 'ELASTIC', unit: 'm', color: 'Qora', size: '40mm', stockQty: 310, minThreshold: 60, costPerUnit: 8_500 },
  { name: 'To‘qilgan brend yorlig‘i', sku: 'AC-LBL-001', category: 'LABEL', unit: 'pcs', color: 'Qora ustida oltin', stockQty: 1450, minThreshold: 300, costPerUnit: 3_200 },
  { name: 'Yog‘och veshalka — yong‘oq', sku: 'AC-HNG-001', category: 'HANGER', unit: 'pcs', color: 'Yong‘oq', stockQty: 240, minThreshold: 60, costPerUnit: 38_000 },
  { name: 'Paxta kiyim qopi', sku: 'AC-BAG-001', category: 'BAG', unit: 'pcs', color: 'Ekru', stockQty: 180, minThreshold: 60, costPerUnit: 42_000 },
  { name: 'Ilgak va halqa — qora', sku: 'AC-HOK-001', category: 'HOOK', unit: 'pcs', color: 'Qora', stockQty: 520, minThreshold: 120, costPerUnit: 2_100 }
] as const

export type SeededMaterialIndex = {
  fabricsByType: Map<string, Types.ObjectId>
  accessoriesByCategory: Map<string, Types.ObjectId>
}
