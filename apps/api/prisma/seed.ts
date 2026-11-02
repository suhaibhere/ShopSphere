import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const checkedAt = new Date('2026-11-02T00:00:00.000Z');

// Reference prices and key specifications are taken from official India product pages.
// They are a snapshot, not a live price feed; update this catalog before treating prices as current.
const products = [
  {
    name: 'iPhone 16 (128 GB)',
    slug: 'iphone-16-128gb',
    brand: 'Apple',
    price: 89900,
    description:
      'Apple iPhone 16 with 128 GB storage. Listed at the official Apple India Store; final price and availability can change.',
    sourceUrl: 'https://www.apple.com/in/shop/buy-iphone/iphone-16',
    imageUrl: null,
    specifications: {
      Display: '6.1-inch Super Retina XDR',
      Storage: '128 GB',
      'Main camera': '48 MP Fusion',
      Chip: 'A18',
      Source: 'Apple India Store',
    },
  },
  {
    name: 'Pixel 10a (128 GB)',
    slug: 'google-pixel-10a-128gb',
    brand: 'Google',
    price: 55999,
    description:
      'Google Pixel 10a. The official Google Store India page lists ₹55,999 as the regular price; time-limited offers may differ.',
    sourceUrl: 'https://store.google.com/in/product/pixel_10a?hl=en-IN',
    imageUrl: null,
    specifications: {
      Display: '6.3-inch Actua',
      Storage: '128 GB',
      'Main camera': '48 MP wide + 13 MP ultrawide',
      'Software support': '7 years of OS and security updates',
      Source: 'Google Store India',
    },
  },
  {
    name: 'Pixel 10 (128 GB)',
    slug: 'google-pixel-10-128gb',
    brand: 'Google',
    price: 79999,
    description:
      'Google Pixel 10. The Google Store India offers page lists ₹79,999; promotions and availability can change.',
    sourceUrl: 'https://store.google.com/in/product/pixel_10?hl=en-IN',
    imageUrl: null,
    specifications: {
      Display: '6.3-inch Actua',
      Storage: '128 GB',
      'Main camera': 'Triple rear camera',
      Source: 'Google Store India',
    },
  },
  {
    name: 'OnePlus Nord 5 (base configuration)',
    slug: 'oneplus-nord-5',
    brand: 'OnePlus',
    price: 33999,
    description:
      'OnePlus Nord 5. OnePlus India lists a starting price of ₹33,999; check the official page for current configuration and stock.',
    sourceUrl: 'https://www.oneplus.in/nord-5',
    imageUrl: null,
    specifications: {
      Display: '1.5K AMOLED, up to 144 Hz',
      Processor: 'Snapdragon 8-series platform',
      Battery: '6,800 mAh',
      Charging: '80 W SUPERVOOC',
      Source: 'OnePlus India',
    },
  },
  {
    name: 'Galaxy S25 (128 GB)',
    slug: 'samsung-galaxy-s25-128gb',
    brand: 'Samsung',
    price: 69999,
    description:
      'Samsung Galaxy S25 with 128 GB storage. Samsung India lists ₹69,999 for this storage option; offers and stock can change.',
    sourceUrl: 'https://www.samsung.com/in/smartphones/galaxy-s25/buy/',
    imageUrl: null,
    specifications: {
      Display: '6.2-inch Dynamic AMOLED 2X',
      Storage: '128 GB',
      RAM: '12 GB',
      Source: 'Samsung India',
    },
  },
];

async function main() {
  const category = await db.category.upsert({
    where: { slug: 'smartphones' },
    update: {
      name: 'Smartphones',
      description: 'India-market phones with source-linked product details and reference prices.',
    },
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'India-market phones with source-linked product details and reference prices.',
    },
  });

  // Remove only the old fictional starter catalog so it cannot be mistaken for real inventory.
  const fictional = { description: { contains: 'fictional demonstration product' } };
  await db.comparisonItem.deleteMany({ where: { product: fictional } });
  await db.product.deleteMany({ where: fictional });
  await db.category.deleteMany({ where: { products: { none: {} }, slug: { not: 'smartphones' } } });

  for (const product of products) {
    await db.product.upsert({
      where: { slug: product.slug },
      update: { ...product, currency: 'INR', categoryId: category.id, priceCheckedAt: checkedAt },
      create: { ...product, currency: 'INR', categoryId: category.id, priceCheckedAt: checkedAt },
    });
  }
  console.log(`Seeded ${products.length} real, source-linked India smartphone listings.`);
}

main().finally(() => db.$disconnect());
