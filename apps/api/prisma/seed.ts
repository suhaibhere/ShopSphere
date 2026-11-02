import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const catalog = [
  {
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Pocket-sized tools for the everyday.',
    products: [
      [
        'Forma One',
        'Aster',
        649,
        {
          Display: '6.2 in OLED',
          Processor: 'Aster A1',
          RAM: '8 GB',
          Storage: '256 GB',
          Battery: '4,500 mAh',
          OS: 'FormaOS 4',
        },
      ],
      [
        'Forma One Mini',
        'Aster',
        529,
        {
          Display: '5.9 in OLED',
          Processor: 'Aster A1',
          RAM: '8 GB',
          Storage: '128 GB',
          Battery: '4,100 mAh',
          OS: 'FormaOS 4',
        },
      ],
      [
        'North S',
        'Northstar',
        799,
        {
          Display: '6.5 in AMOLED',
          Processor: 'North N2',
          RAM: '12 GB',
          Storage: '256 GB',
          Battery: '5,000 mAh',
          OS: 'North OS 3',
        },
      ],
      [
        'North S Lite',
        'Northstar',
        479,
        {
          Display: '6.3 in AMOLED',
          Processor: 'North N1',
          RAM: '8 GB',
          Storage: '128 GB',
          Battery: '4,800 mAh',
          OS: 'North OS 3',
        },
      ],
    ],
  },
  {
    name: 'Laptops',
    slug: 'laptops',
    description: 'Considered machines for work and making.',
    products: [
      [
        'Atelier 14',
        'Atelier',
        1299,
        {
          Processor: 'Atelier A4',
          RAM: '16 GB',
          Storage: '512 GB SSD',
          Display: '14 in, 2.8K',
          Graphics: 'Integrated A4',
          OS: 'AtelierOS',
        },
      ],
      [
        'Atelier 14 Air',
        'Atelier',
        1099,
        {
          Processor: 'Atelier A3',
          RAM: '16 GB',
          Storage: '512 GB SSD',
          Display: '14 in, 2.5K',
          Graphics: 'Integrated A3',
          OS: 'AtelierOS',
        },
      ],
      [
        'Fieldbook 15',
        'Fieldwork',
        1199,
        {
          Processor: 'Field F7',
          RAM: '32 GB',
          Storage: '1 TB SSD',
          Display: '15 in, 2.8K',
          Graphics: 'Integrated F7',
          OS: 'Fieldwork Linux',
        },
      ],
      [
        'Fieldbook 13',
        'Fieldwork',
        949,
        {
          Processor: 'Field F5',
          RAM: '16 GB',
          Storage: '512 GB SSD',
          Display: '13.5 in, 2.2K',
          Graphics: 'Integrated F5',
          OS: 'Fieldwork Linux',
        },
      ],
    ],
  },
  {
    name: 'Headphones',
    slug: 'headphones',
    description: 'Quietly capable listening companions.',
    products: [
      [
        'Still H1',
        'Still',
        329,
        {
          Type: 'Over-ear',
          Connectivity: 'Bluetooth 5.3',
          'Battery life': '38 hours',
          'Noise cancellation': 'Adaptive',
          Weight: '258 g',
        },
      ],
      [
        'Still H1 Studio',
        'Still',
        399,
        {
          Type: 'Over-ear',
          Connectivity: 'Bluetooth 5.3, USB-C',
          'Battery life': '42 hours',
          'Noise cancellation': 'Adaptive',
          Weight: '274 g',
        },
      ],
      [
        'Morrow Loop',
        'Morrow',
        219,
        {
          Type: 'On-ear',
          Connectivity: 'Bluetooth 5.2',
          'Battery life': '30 hours',
          'Noise cancellation': 'Passive',
          Weight: '196 g',
        },
      ],
      [
        'Morrow Loop Pro',
        'Morrow',
        279,
        {
          Type: 'Over-ear',
          Connectivity: 'Bluetooth 5.3',
          'Battery life': '36 hours',
          'Noise cancellation': 'Hybrid',
          Weight: '231 g',
        },
      ],
    ],
  },
  {
    name: 'Smartwatches',
    slug: 'smartwatches',
    description: 'Useful information, always at hand.',
    products: [
      [
        'Tempo 2',
        'Tempo',
        249,
        {
          Display: '1.8 in AMOLED',
          'Battery life': '7 days',
          Connectivity: 'Bluetooth, GPS',
          'Water resistance': '5 ATM',
          Compatibility: 'iOS, Android',
        },
      ],
      [
        'Tempo 2 Field',
        'Tempo',
        319,
        {
          Display: '1.9 in AMOLED',
          'Battery life': '12 days',
          Connectivity: 'Bluetooth, GPS, NFC',
          'Water resistance': '10 ATM',
          Compatibility: 'iOS, Android',
        },
      ],
      [
        'Arc Watch',
        'Arc',
        299,
        {
          Display: '1.7 in OLED',
          'Battery life': '5 days',
          Connectivity: 'Bluetooth, GPS',
          'Water resistance': '5 ATM',
          Compatibility: 'iOS',
        },
      ],
      [
        'Arc Watch Lite',
        'Arc',
        189,
        {
          Display: '1.6 in OLED',
          'Battery life': '8 days',
          Connectivity: 'Bluetooth',
          'Water resistance': '3 ATM',
          Compatibility: 'iOS, Android',
        },
      ],
    ],
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  for (const category of catalog) {
    const savedCategory = await db.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: { name: category.name, slug: category.slug, description: category.description },
    });
    for (const [name, brand, price, specifications] of category.products) {
      const slug = slugify(name);
      const description = `${name} is a fictional demonstration product created for ShopSphere. Product details are sample data for discovery and comparison practice.`;
      await db.product.upsert({
        where: { slug },
        update: {
          name,
          brand,
          price,
          description,
          categoryId: savedCategory.id,
          specifications,
          imageUrl: null,
        },
        create: {
          name,
          slug,
          brand,
          price,
          description,
          categoryId: savedCategory.id,
          specifications,
          currency: 'USD',
        },
      });
    }
  }
  console.log('Seeded 4 categories and 16 fictional demo products.');
}

main().finally(() => db.$disconnect());
