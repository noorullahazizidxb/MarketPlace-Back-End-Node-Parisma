#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../src/utils/password.js';

dotenv.config();

const prisma = new PrismaClient();
const backendRoot = process.cwd();
const uploadsRoot = path.resolve(backendRoot, 'uploads');
const listingImageDir = path.resolve(backendRoot, 'dummydata', 'images');
const profileImageDir = path.resolve(backendRoot, 'dummydata', 'UserProfileImages');
const frontendDefaultThemePath = path.resolve(
  backendRoot,
  '..',
  'marketplace-Front-end',
  'theme-data',
  'default-theme.json'
);
const defaultPassword = process.env.SEED_USER_PASSWORD || 'MarketPlace@2026';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@marketplace.example.com';
const adminPhone = process.env.ADMIN_PHONE || '+93700000001';

const afghanLocations = [
  { province: 'Kabul', city: 'Kabul', district: 'Wazir Akbar Khan', addressLine: 'House 22, Street 14' },
  { province: 'Kabul', city: 'Kabul', district: 'Karte Seh', addressLine: 'Apartment 12, Street 3' },
  { province: 'Herat', city: 'Herat', district: 'District 2', addressLine: 'Shop 7, Ansari Square' },
  { province: 'Balkh', city: 'Mazar-e-Sharif', district: 'Police District 3', addressLine: 'Store 18, Mawlana Jalaluddin Balkhi Road' },
  { province: 'Kandahar', city: 'Kandahar', district: 'District 1', addressLine: 'House 46, Aino Mina Block C' },
  { province: 'Nangarhar', city: 'Jalalabad', district: 'Behsud', addressLine: 'Shop 9, University Road' },
  { province: 'Kunduz', city: 'Kunduz', district: 'Central Kunduz', addressLine: 'House 11, Khan Abad Road' },
  { province: 'Bamyan', city: 'Bamyan', district: 'Central Bamyan', addressLine: 'Shop 4, New City Road' },
  { province: 'Ghazni', city: 'Ghazni', district: 'District 1', addressLine: 'Store 3, Sultan Mahmud Road' },
  { province: 'Baghlan', city: 'Pul-e Khumri', district: 'Central Pul-e Khumri', addressLine: 'Warehouse 2, Industrial Park Road' },
  { province: 'Badakhshan', city: 'Fayzabad', district: 'District 1', addressLine: 'House 17, River View Road' },
  { province: 'Takhar', city: 'Taloqan', district: 'District 2', addressLine: 'Shop 6, Khwaja Ghar Street' },
  { province: 'Samangan', city: 'Aybak', district: 'Central Aybak', addressLine: 'House 5, Old Bazaar Lane' },
  { province: 'Laghman', city: 'Mehtarlam', district: 'District 1', addressLine: 'Store 20, Mehtarlam Main Road' },
  { province: 'Khost', city: 'Khost', district: 'District 2', addressLine: 'House 28, Shamal Road' },
  { province: 'Paktia', city: 'Gardez', district: 'District 1', addressLine: 'Shop 14, Gardez Bazaar' },
  { province: 'Helmand', city: 'Lashkar Gah', district: 'District 1', addressLine: 'House 31, Bost University Road' },
  { province: 'Faryab', city: 'Maimana', district: 'District 2', addressLine: 'Shop 12, Andkhoy Street' },
  { province: 'Daykundi', city: 'Nili', district: 'Central Nili', addressLine: 'House 8, New Market Road' },
  { province: 'Parwan', city: 'Charikar', district: 'District 3', addressLine: 'Store 16, Kohdaman Road' },
];

const userSeed = [
  { firstName: 'Marketplace', lastName: 'Admin', email: adminEmail, phone: adminPhone },
  { firstName: 'Farid', lastName: 'Rahimi', email: 'farid.rahimi@example.com', phone: '+93700000002' },
  { firstName: 'Laila', lastName: 'Noori', email: 'laila.noori@example.com', phone: '+93700000003' },
  { firstName: 'Bilal', lastName: 'Ahmadi', email: 'bilal.ahmadi@example.com', phone: '+93700000004' },
  { firstName: 'Zahra', lastName: 'Azizi', email: 'zahra.azizi@example.com', phone: '+93700000005' },
  { firstName: 'Mariam', lastName: 'Hamidi', email: 'mariam.hamidi@example.com', phone: '+93700000006' },
  { firstName: 'Hamidullah', lastName: 'Stanikzai', email: 'hamidullah.stanikzai@example.com', phone: '+93700000007' },
  { firstName: 'Freshta', lastName: 'Mohammadi', email: 'freshta.mohammadi@example.com', phone: '+93700000008' },
  { firstName: 'Bashir', lastName: 'Ahmadzai', email: 'bashir.ahmadzai@example.com', phone: '+93700000009' },
  { firstName: 'Tamana', lastName: 'Qaderi', email: 'tamana.qaderi@example.com', phone: '+93700000010' },
  { firstName: 'Jawad', lastName: 'Popal', email: 'jawad.popal@example.com', phone: '+93700000011' },
  { firstName: 'Nilab', lastName: 'Ahmadi', email: 'nilab.ahmadi@example.com', phone: '+93700000012' },
  { firstName: 'Qudratullah', lastName: 'Faqiri', email: 'qudratullah.faqiri@example.com', phone: '+93700000013' },
  { firstName: 'Shabnam', lastName: 'Sadiqi', email: 'shabnam.sadiqi@example.com', phone: '+93700000014' },
  { firstName: 'Omar', lastName: 'Hossaini', email: 'omar.hossaini@example.com', phone: '+93700000015' },
  { firstName: 'Roya', lastName: 'Aria', email: 'roya.aria@example.com', phone: '+93700000016' },
  { firstName: 'Jamshid', lastName: 'Wardak', email: 'jamshid.wardak@example.com', phone: '+93700000017' },
  { firstName: 'Sadaf', lastName: 'Rahmani', email: 'sadaf.rahmani@example.com', phone: '+93700000018' },
  { firstName: 'Haroon', lastName: 'Barakzai', email: 'haroon.barakzai@example.com', phone: '+93700000019' },
  { firstName: 'Karima', lastName: 'Yasini', email: 'karima.yasini@example.com', phone: '+93700000020' },
];

const categorySeed = [
  { name: 'Real Estate', slug: 'real-estate' },
  { name: 'Apartments for Rent', slug: 'apartments-for-rent', parentSlug: 'real-estate' },
  { name: 'Houses for Sale', slug: 'houses-for-sale', parentSlug: 'real-estate' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Smartphones', slug: 'smartphones', parentSlug: 'electronics' },
  { name: 'Laptops', slug: 'laptops', parentSlug: 'electronics' },
  { name: 'Audio', slug: 'audio', parentSlug: 'electronics' },
  { name: 'Televisions', slug: 'televisions', parentSlug: 'electronics' },
  { name: 'Vehicles', slug: 'vehicles' },
  { name: 'SUVs', slug: 'suvs', parentSlug: 'vehicles' },
  { name: 'Bicycles', slug: 'bicycles', parentSlug: 'vehicles' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Bedroom Furniture', slug: 'bedroom-furniture', parentSlug: 'home-living' },
  { name: 'Office Furniture', slug: 'office-furniture', parentSlug: 'home-living' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Women\'s Clothing', slug: 'womens-clothing', parentSlug: 'fashion' },
  { name: 'Men\'s Clothing', slug: 'mens-clothing', parentSlug: 'fashion' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
  { name: 'Books', slug: 'books' },
  { name: 'Kids Fashion', slug: 'kids-fashion', parentSlug: 'fashion' },
];

const listingSeed = [
  {
    title: 'Apple iPhone 14 Pro 256GB Deep Purple',
    categorySlug: 'smartphones',
    imageFile: 'Apple-iPhone-14-Pro-Mobile-Phone-493177786-i-1-1200Wx1200H-485x485-optimized.webp',
    listingType: 'SALE',
    price: 79500,
    metadata: { brand: 'Apple', model: 'iPhone 14 Pro', storage: '256GB', condition: 'Used - Excellent', batteryHealth: '89%' },
    description:
      'Factory-unlocked iPhone 14 Pro in clean condition with 256GB storage, 89% battery health, original box, and charging cable. Suitable for business use, mobile photography, and daily commuting in Kabul.',
    feedbackComment: 'The phone matched the listing photos and the seller shared the serial number before the handover.',
  },
  {
    title: 'Google Pixel 9 Pro 128GB Obsidian',
    categorySlug: 'smartphones',
    imageFile: 'Google_-_Pixel_9_Pro_-_Obsidian_3__08783.webp',
    listingType: 'SALE',
    price: 68200,
    metadata: { brand: 'Google', model: 'Pixel 9 Pro', storage: '128GB', condition: 'New - Open Box', warranty: '7 days checking warranty' },
    description:
      'Pixel 9 Pro with original packaging and tempered glass already installed. The device was brought from Dubai and is offered with a seven-day checking warranty for serious buyers in Kabul.',
    feedbackComment: 'Good communication and the buyer was able to test the camera, eSIM, and fingerprint before payment.',
  },
  {
    title: 'OnePlus Nord CE 5G 8GB/128GB',
    categorySlug: 'smartphones',
    imageFile: 'oneplusN1.jpg',
    listingType: 'SALE',
    price: 24800,
    metadata: { brand: 'OnePlus', model: 'Nord CE 5G', storage: '128GB', ram: '8GB', condition: 'Used - Very Good' },
    description:
      'OnePlus Nord CE 5G with smooth AMOLED display, 8GB RAM, and 128GB storage. The handset has been used carefully with a case and is ideal for students or office staff who want stable performance.',
    feedbackComment: 'Battery timing was as described and the device came with a case and charger.',
  },
  {
    title: 'Oppo A54 128GB Sky Blue',
    categorySlug: 'smartphones',
    imageFile: 'oppophone1.jpg',
    listingType: 'SALE',
    price: 16200,
    metadata: { brand: 'Oppo', model: 'A54', storage: '128GB', ram: '4GB', condition: 'Used - Good' },
    description:
      'Reliable mid-range Oppo A54 with strong battery life and clean display. The owner used it mostly for WhatsApp, calls, and online orders, so it remains a practical option for daily work.',
    feedbackComment: 'Affordable option for a second phone and the seller was transparent about the small frame marks.',
  },
  {
    title: 'Redmi 9A 32GB Entry Level Smartphone',
    categorySlug: 'smartphones',
    imageFile: 'redmi9A1.jpg',
    listingType: 'SALE',
    price: 7600,
    metadata: { brand: 'Xiaomi', model: 'Redmi 9A', storage: '32GB', ram: '3GB', condition: 'Used - Good' },
    description:
      'Redmi 9A in working condition with 3GB RAM and 32GB storage. It is suited for calls, light browsing, and mobile money use in smaller provincial markets where dependable budget phones are in demand.',
    feedbackComment: 'Exactly what was needed for a family backup phone and it was ready to use immediately.',
  },
  {
    title: 'Samsung Galaxy M31 128GB Navy',
    categorySlug: 'smartphones',
    imageFile: 'SamsungM311.jpg',
    listingType: 'SALE',
    price: 21800,
    metadata: { brand: 'Samsung', model: 'Galaxy M31', storage: '128GB', ram: '6GB', condition: 'Used - Very Good' },
    description:
      'Samsung Galaxy M31 with AMOLED screen and strong 6000mAh battery. The handset remains a dependable choice for users who need long battery life for travel between districts.',
    feedbackComment: 'The seller provided the IMEI and the buyer confirmed the display and battery health on pickup.',
  },
  {
    title: 'Apple MacBook Pro 16-inch for Design Work',
    categorySlug: 'laptops',
    imageFile: 'appleLaptop1.jpg',
    listingType: 'SALE',
    price: 134000,
    metadata: { brand: 'Apple', model: 'MacBook Pro 16-inch', memory: '16GB', storage: '512GB SSD', condition: 'Used - Excellent' },
    description:
      'MacBook Pro 16-inch with 16GB memory and 512GB SSD, maintained by a freelance designer. The machine runs quietly and is suitable for editing, programming, and remote client work.',
    feedbackComment: 'The laptop was clean, battery cycles were reasonable, and the screen had no visible defects.',
  },
  {
    title: 'ASUS ROG Zephyrus Gaming Laptop',
    categorySlug: 'laptops',
    imageFile: 'gamingLaptop1.jpg',
    listingType: 'SALE',
    price: 96500,
    metadata: { brand: 'ASUS', model: 'ROG Zephyrus', graphics: 'Dedicated GPU', condition: 'Used - Very Good', usage: 'Gaming and rendering' },
    description:
      'ASUS ROG Zephyrus laptop with high-refresh display and dedicated graphics. The owner used it for architectural rendering and competitive gaming, and the cooling system remains in good condition.',
    feedbackComment: 'Benchmarks matched the seller description and the laptop handled stress testing before pickup.',
  },
  {
    title: 'HP 15s Student Laptop 256GB SSD',
    categorySlug: 'laptops',
    imageFile: 'studentLaptophp1.jpg',
    listingType: 'SALE',
    price: 31400,
    metadata: { brand: 'HP', model: '15s', storage: '256GB SSD', memory: '8GB', condition: 'Used - Good' },
    description:
      'HP 15s laptop with SSD storage for quick startup and enough performance for online classes, office documents, and browsing. It has a clean keyboard and stable Wi-Fi for home study.',
    feedbackComment: 'Well priced for a student machine and the buyer appreciated the SSD and fresh Windows installation.',
  },
  {
    title: 'Lenovo Travel Laptop with Office Ready Setup',
    categorySlug: 'laptops',
    imageFile: 'travelLaptop1.jpg',
    listingType: 'SALE',
    price: 28600,
    metadata: { brand: 'Lenovo', model: 'IdeaPad', storage: '256GB SSD', memory: '8GB', condition: 'Used - Good' },
    description:
      'Light Lenovo laptop configured for office work, browsing, and online bookkeeping. It is a good fit for shop managers or coordinators who need a dependable machine for travel between branches.',
    feedbackComment: 'Simple, practical, and ready for office work without any extra setup required.',
  },
  {
    title: 'Apple AirPods Max Silver',
    categorySlug: 'audio',
    imageFile: 'hdm-airpodsmax-046-1647967194.avif',
    listingType: 'SALE',
    price: 34800,
    metadata: { brand: 'Apple', model: 'AirPods Max', condition: 'Used - Excellent', feature: 'Noise Cancellation' },
    description:
      'AirPods Max in silver finish with active noise cancellation and carrying case. The headphones were used mainly indoors and remain a premium option for music, editing, and long calls.',
    feedbackComment: 'The sound quality and pairing worked immediately and the ear cushions were still in very good condition.',
  },
  {
    title: 'Wireless Noise Cancelling Headphones',
    categorySlug: 'audio',
    imageFile: 'headphones-isolate-on-white-wireless-260nw-2466522991.webp',
    listingType: 'SALE',
    price: 9200,
    metadata: { brand: 'Generic Premium', model: 'Bluetooth Headset', condition: 'New', feature: 'Foldable design' },
    description:
      'Bluetooth over-ear headphones with foldable frame, soft ear cushions, and reliable battery life. A practical choice for students, remote agents, and commuters who want cleaner audio on a budget.',
    feedbackComment: 'The headset paired quickly and battery timing was strong for the price point.',
  },
  {
    title: 'Queen Bed with Storage Drawers',
    categorySlug: 'bedroom-furniture',
    imageFile: 'bedwithstorage.jpg',
    listingType: 'SALE',
    price: 25500,
    metadata: { material: 'Engineered wood', size: 'Queen', condition: 'Used - Very Good', feature: 'Under-bed storage' },
    description:
      'Queen-size bed frame with built-in storage drawers and matching headboard. It is suitable for compact apartments where practical storage matters as much as appearance.',
    feedbackComment: 'The frame was sturdy and easy to reassemble after transport within the city.',
  },
  {
    title: 'Compact Study Desk for Home Office',
    categorySlug: 'office-furniture',
    imageFile: 'desk.jpg',
    listingType: 'SALE',
    price: 8900,
    metadata: { material: 'Laminated wood', condition: 'Used - Good', feature: 'Side shelving' },
    description:
      'Compact desk with side shelves for books, documents, and a laptop. It fits small study corners and is popular with students, tailors, and home-based online sellers.',
    feedbackComment: 'Good value for a small room and the storage shelves made it much more useful than a plain table.',
  },
  {
    title: 'Ergonomic Mesh Office Chair',
    categorySlug: 'office-furniture',
    imageFile: 'officechairumbrella.jpg',
    listingType: 'SALE',
    price: 11200,
    metadata: { material: 'Mesh back', condition: 'Used - Very Good', feature: 'Height adjustable' },
    description:
      'Mesh-back office chair with rolling base and adjustable height. The chair suits long desk sessions for call agents, accountants, or anyone setting up a basic office workspace.',
    feedbackComment: 'Comfortable enough for daily work and the wheels and lift mechanism worked properly.',
  },
  {
    title: 'Vaseline Deep Moisture Body Lotion 400ml',
    categorySlug: 'beauty-personal-care',
    imageFile: 'vaslinebodylotion.jpg',
    listingType: 'SALE',
    price: 420,
    metadata: { brand: 'Vaseline', size: '400ml', condition: 'New', packageType: 'Retail bottle' },
    description:
      'New 400ml Vaseline Deep Moisture lotion suitable for dry weather conditions. The bottle is sealed and sourced through a Kabul retail wholesaler for normal household use.',
    feedbackComment: 'Fresh stock, clean packaging, and fair retail pricing for a trusted personal care brand.',
  },
  {
    title: 'WOW Apple Cider Vinegar Face Wash',
    categorySlug: 'beauty-personal-care',
    imageFile: 'wowskincare.jpg',
    listingType: 'SALE',
    price: 680,
    metadata: { brand: 'WOW Skin Science', size: '100ml', condition: 'New', feature: 'Built-in brush' },
    description:
      'Sealed WOW face wash with built-in applicator brush. Suitable for cosmetic shops or individual buyers who want original-looking skincare stock in manageable quantities.',
    feedbackComment: 'Packaging looked fresh and sealed, and the seller was clear that the item was unopened.',
  },
  {
    title: 'Lakme Eyeconic Kajal Twin Pack',
    categorySlug: 'beauty-personal-care',
    imageFile: 'kajal2.jpg',
    listingType: 'SALE',
    price: 350,
    metadata: { brand: 'Lakme', condition: 'New', packSize: '2 pieces' },
    description:
      'Twin pack Lakme Eyeconic Kajal suitable for retail sale or personal use. The stock is easy to carry, well priced, and in demand for neighborhood cosmetic counters.',
    feedbackComment: 'The product was sealed and delivered exactly as shown in the image.',
  },
  {
    title: 'The Monk Who Sold His Ferrari Paperback',
    categorySlug: 'books',
    imageFile: 'monksoldhisferrari.jpg',
    listingType: 'SALE',
    price: 260,
    metadata: { author: 'Robin Sharma', format: 'Paperback', condition: 'New' },
    description:
      'Clean paperback copy of The Monk Who Sold His Ferrari for readers who want practical self-development titles at bookstore pricing. Suitable for retail shelves or personal reading.',
    feedbackComment: 'The buyer received a neat paperback copy with no torn pages or marks.',
  },
  {
    title: 'Puma Men\'s White Polo Shirt Medium',
    categorySlug: 'mens-clothing',
    imageFile: 'pumatshirt1.jpg',
    listingType: 'SALE',
    price: 1350,
    metadata: { brand: 'Puma', size: 'M', condition: 'New', fabric: 'Poly-cotton' },
    description:
      'White Puma polo shirt in medium size, suitable for casual office wear and clean summer styling. The piece is unused and appropriate for boutique resale or direct purchase.',
    feedbackComment: 'Fabric quality was better than expected and the sizing matched the listing details.',
  },
];

const blogSeed = [
  {
    title: 'How to verify a used phone before paying cash in Kabul',
    imageFile: 'Apple-iPhone-14-Pro-Mobile-Phone-493177786-i-1-1200Wx1200H-485x485-optimized.webp',
    points: [
      'check the IMEI, battery health, and physical frame condition before you agree on a price',
      'insert your own SIM card and test Wi-Fi, camera, speakers, and biometric unlock',
      'ask for a short checking period when buying premium devices from independent sellers',
    ],
  },
  {
    title: 'Why Pixel and Galaxy devices sell faster in Afghanistan\'s city markets',
    imageFile: 'Google_-_Pixel_9_Pro_-_Obsidian_3__08783.webp',
    points: [
      'buyers usually prefer clear camera performance and reliable software updates',
      'good battery condition and original accessories improve trust and speed up a sale',
      'clean listings with district-level pickup details attract serious buyers faster',
    ],
  },
  {
    title: 'Writing product descriptions that actually convert',
    imageFile: 'oneplusN2.jpg',
    points: [
      'start with the exact brand, model, storage, and condition in the title',
      'mention included accessories and explain any honest defects in one clear sentence',
      'add a pickup area, testing option, and realistic final price expectation',
    ],
  },
  {
    title: 'Budget smartphone buying guide for students and office staff',
    imageFile: 'oppophone2.jpg',
    points: [
      'battery endurance matters more than camera quality for many practical buyers',
      'mid-range storage and clean charging ports are often better value than flashy design',
      'older but stable models move well when they are priced honestly',
    ],
  },
  {
    title: 'What budget phone buyers notice first on a listing page',
    imageFile: 'redmi9A2.jpg',
    points: [
      'they look for a readable price, clear photos, and proof that the screen is healthy',
      'simple descriptions in local buying language outperform generic marketing words',
      'timely seller replies usually matter more than advanced specifications',
    ],
  },
  {
    title: 'Battery life as a sales advantage for mid-range Samsung phones',
    imageFile: 'SamsungM312.jpg',
    points: [
      'long battery life remains one of the strongest triggers for serious follow-up messages',
      'include real usage examples such as delivery work, office calling, or travel days',
      'a recent battery replacement should always be disclosed clearly',
    ],
  },
  {
    title: 'Laptop checks every buyer should do before pickup',
    imageFile: 'appleLaptop2.jpg',
    points: [
      'test keyboard, battery cycles, speakers, ports, and webcam before final payment',
      'screen condition and storage health are worth documenting with screenshots',
      'a clean operating system setup increases buyer confidence immediately',
    ],
  },
  {
    title: 'Gaming laptops and honest seller expectations',
    imageFile: 'gamingLaptop2.jpg',
    points: [
      'buyers expect benchmark honesty more than perfect cosmetic condition',
      'thermal behavior and fan noise should be explained clearly in the listing body',
      'include actual use history such as gaming, design work, or rendering jobs',
    ],
  },
  {
    title: 'Selling student laptops during exam season',
    imageFile: 'studentLaptophp2.jpg',
    points: [
      'simple laptops move quickly when the listing clearly states SSD size and RAM',
      'fresh software installation and charger photos remove common buyer doubts',
      'timing the listing before school intake usually improves demand',
    ],
  },
  {
    title: 'Why lightweight work laptops stay in demand across provinces',
    imageFile: 'travelLaptop2.jpg',
    points: [
      'portable devices fit NGO, field operations, and multi-branch shop needs',
      'durability and battery stability often matter more than premium branding',
      'regional delivery coordination should be explained before the deal is confirmed',
    ],
  },
  {
    title: 'Premium headphone listings need better photos, not more words',
    imageFile: 'hdm-airpodsmax-046-1647967194.avif',
    points: [
      'buyers of premium audio products respond to clean close-up photos of ear cups and frame',
      'always mention battery behavior, cable availability, and original case status',
      'demonstrating quick pairing at pickup reduces disputes',
    ],
  },
  {
    title: 'Affordable audio products and marketplace trust',
    imageFile: 'headphones-isolate-on-white-wireless-260nw-2466522991.webp',
    points: [
      'budget headphone buyers care about battery timing and fit more than branding claims',
      'clear packaging photos help prove whether the item is new or used',
      'short demo videos can raise response quality on affordable electronics',
    ],
  },
  {
    title: 'Furniture listings work better with measurement details',
    imageFile: 'bedwithstorage.jpg',
    points: [
      'buyers for beds and wardrobes need dimensions before transport planning',
      'mention whether assembly support is available after delivery',
      'storage features should be explained in the first paragraph, not hidden at the end',
    ],
  },
  {
    title: 'Home office furniture demand is still growing',
    imageFile: 'desk.jpg',
    points: [
      'compact desks and chairs are popular with students, freelancers, and online sellers',
      'functional listings should include shelf count, material, and condition of edges',
      'same-day pickup windows increase conversion on office furniture',
    ],
  },
  {
    title: 'What makes an office chair listing credible',
    imageFile: 'officechairumbrella.jpg',
    points: [
      'buyers want to know if the wheels, hydraulic lift, and mesh support are still solid',
      'a single side-angle photo is not enough for used furniture',
      'state whether the chair was used in a home office or a shared workspace',
    ],
  },
  {
    title: 'Small personal care products can become strong repeat sales',
    imageFile: 'vaslinebodylotion2.jpg',
    points: [
      'repeat buyers usually return for familiar brands with stable pricing and sealed packaging',
      'expiry visibility matters for retail trust even on fast-moving items',
      'bundles and clear size labels help sellers move stock faster',
    ],
  },
  {
    title: 'Skincare listings should focus on authenticity cues',
    imageFile: 'wowskincare.jpg',
    points: [
      'buyers want batch details, sealed caps, and packaging close-ups',
      'avoid exaggerated beauty claims and focus on the actual product format',
      'small-volume skincare sells better when the pickup process is simple',
    ],
  },
  {
    title: 'Cosmetic products move faster with simple package bundles',
    imageFile: 'kajal1.jpg',
    points: [
      'twin packs and starter bundles reduce decision time for low-ticket items',
      'shade names and product counts should appear in the first line of the listing',
      'buyers value sealed stock and transparent sourcing above everything else',
    ],
  },
  {
    title: 'Books remain one of the easiest categories to list well',
    imageFile: 'monksoldhisferrari.jpg',
    points: [
      'clear cover photos and edition details are usually enough to build confidence',
      'state whether the book is used, new, annotated, or part of a larger set',
      'book buyers respond well to pickup options near schools and main bazaars',
    ],
  },
  {
    title: 'Clothing listings succeed when size and fabric are explicit',
    imageFile: 'pumatshirt2.jpg',
    points: [
      'size, fabric blend, and chest measurement prevent unnecessary back-and-forth messages',
      'front and back photos help the buyer confirm cut and condition quickly',
      'new clothing items benefit from direct wording instead of marketing-heavy captions',
    ],
  },
];

const contactMessages = [
  'I want to confirm the seller verification process before listing a phone from Kabul city.',
  'Please explain how long approved listings stay visible before they need renewal.',
  'I need help understanding whether category changes require admin review.',
  'Can your team assist with bulk electronic listings for a retail shop in Herat?',
  'I submitted a listing and want to know why the images are still under moderation.',
  'How do buyers report a misleading condition description after pickup?',
  'Can I assign a representative to my shop account for Jalalabad deliveries?',
  'Please share best practices for pricing used laptops on the platform.',
  'I need support updating my phone number on an existing seller account.',
  'Is there a way to feature selected items on the home page for a campaign?',
  'Can your team review a clothing shop profile before the weekend sale period?',
  'I need help replacing an incorrect image on a beauty product listing.',
  'What documents should a business seller prepare before posting high-value devices?',
  'Please confirm whether rental listings are supported for office furniture.',
  'I want to discuss a partnership for structured book listings from a local bookstore.',
  'Can the moderation team prioritize a verified stock upload for tomorrow morning?',
  'I found a duplicate listing and want guidance before I report it.',
  'Please explain how the WhatsApp contact option is displayed to buyers.',
  'I need help understanding the safest handover process for payments in cash.',
  'Can the admin team review my product descriptions for compliance before publishing?',
];

const themeVariants = [
  { name: 'Kabul Dawn', lightAccent: [206, 68, 58], darkAccent: [206, 70, 48] },
  { name: 'Herat Clay', lightAccent: [24, 62, 58], darkAccent: [24, 66, 46] },
  { name: 'Mazar Sky', lightAccent: [198, 60, 62], darkAccent: [198, 63, 48] },
  { name: 'Kandahar Sand', lightAccent: [34, 58, 61], darkAccent: [34, 60, 45] },
  { name: 'Panjshir Pine', lightAccent: [154, 38, 52], darkAccent: [154, 42, 38] },
  { name: 'Bamyan Stone', lightAccent: [210, 18, 64], darkAccent: [210, 20, 42] },
  { name: 'Badakhshan Sapphire', lightAccent: [222, 66, 56], darkAccent: [222, 70, 44] },
  { name: 'Jalalabad Citrus', lightAccent: [46, 78, 58], darkAccent: [46, 82, 44] },
  { name: 'Gardez Copper', lightAccent: [18, 56, 57], darkAccent: [18, 60, 43] },
  { name: 'Khost Cedar', lightAccent: [138, 34, 54], darkAccent: [138, 38, 38] },
  { name: 'Charikar Fog', lightAccent: [214, 24, 68], darkAccent: [214, 26, 44] },
  { name: 'Fayzabad Indigo', lightAccent: [238, 48, 60], darkAccent: [238, 52, 42] },
  { name: 'Mehtarlam Olive', lightAccent: [80, 34, 56], darkAccent: [80, 38, 40] },
  { name: 'Maimana Orchard', lightAccent: [112, 42, 58], darkAccent: [112, 45, 40] },
  { name: 'Nili Horizon', lightAccent: [196, 30, 60], darkAccent: [196, 34, 42] },
  { name: 'Pul-e Khumri Slate', lightAccent: [218, 16, 58], darkAccent: [218, 18, 38] },
  { name: 'Samangan Rose', lightAccent: [344, 58, 66], darkAccent: [344, 60, 46] },
  { name: 'Taloqan Mint', lightAccent: [166, 42, 60], darkAccent: [166, 46, 42] },
  { name: 'Kunduz Brick', lightAccent: [12, 54, 58], darkAccent: [12, 58, 42] },
  { name: 'Lashkar Gah Night', lightAccent: [230, 34, 56], darkAccent: [230, 38, 34] },
];

const adImageUrls = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1600&auto=format&fit=crop',
];

function sanitizeFileName(fileName) {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
}

function roleForIndex(index) {
  if (index === 0) return 'ADMIN';
  if (index < 5) return 'REPRESENTATIVE';
  return 'USER';
}

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    [red, green, blue] = [chroma, x, 0];
  } else if (hue < 120) {
    [red, green, blue] = [x, chroma, 0];
  } else if (hue < 180) {
    [red, green, blue] = [0, chroma, x];
  } else if (hue < 240) {
    [red, green, blue] = [0, x, chroma];
  } else if (hue < 300) {
    [red, green, blue] = [x, 0, chroma];
  } else {
    [red, green, blue] = [chroma, 0, x];
  }

  const toHex = (value) => {
    const channel = Math.round((value + match) * 255);
    return channel.toString(16).padStart(2, '0');
  };

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function colorToken(hue, saturation, lightness) {
  return {
    css: `hsl(${hue} ${saturation}% ${lightness}%)`,
    hex: hslToHex(hue, saturation, lightness),
    hsl: [hue, saturation, lightness],
  };
}

function locationLabel(location) {
  return `${location.district}, ${location.city}, ${location.province}, Afghanistan`;
}

function locationAddress(location) {
  return `${location.addressLine}, ${location.district}, ${location.city}, ${location.province}, Afghanistan`;
}

function userAddress(location) {
  return {
    street: location.addressLine,
    district: location.district,
    city: location.city,
    province: location.province,
    country: 'Afghanistan',
  };
}

async function sortedFiles(dirPath) {
  try {
    return (await fs.readdir(dirPath)).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function copyScopedImage(scope, entityId, fileName) {
  const sourcePath = path.join(listingImageDir, fileName);
  const destinationDir = path.join(uploadsRoot, scope, entityId);
  const destinationName = sanitizeFileName(fileName);
  const destinationPath = path.join(destinationDir, destinationName);
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  return `/uploads/${scope}/${entityId}/${destinationName}`;
}

async function copyProfileImage(userId, fileName) {
  const sourcePath = path.join(profileImageDir, fileName);
  const extension = path.extname(fileName) || '.jpg';
  const destinationDir = path.join(uploadsRoot, 'users');
  const destinationName = sanitizeFileName(`${userId}${extension.toLowerCase()}`);
  const destinationPath = path.join(destinationDir, destinationName);
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  return `/uploads/users/${destinationName}`;
}

async function loadThemeTemplate() {
  const source = await fs.readFile(frontendDefaultThemePath, 'utf8');
  return JSON.parse(source);
}

function makeThemePayload(baseTheme, variant, index) {
  const theme = JSON.parse(JSON.stringify(baseTheme));
  theme.id = index + 1;
  theme.name = variant.name;
  if (theme.tokens?.light) {
    theme.tokens.light.accent = colorToken(...variant.lightAccent);
    theme.tokens.light.linkBg = colorToken(variant.lightAccent[0], variant.lightAccent[1], Math.max(variant.lightAccent[2] - 8, 35));
  }
  if (theme.tokens?.dark) {
    theme.tokens.dark.accent = colorToken(...variant.darkAccent);
    theme.tokens.dark.linkBg = colorToken(variant.darkAccent[0], variant.darkAccent[1], Math.max(variant.darkAccent[2] - 6, 28));
  }
  theme.preferredColorMode = 'HEX';
  return theme;
}

async function cleanupExistingData() {
  await prisma.storyImage.deleteMany();
  await prisma.story.deleteMany();
  await prisma.blogComment.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.searchIndex.deleteMany();
  await prisma.listingRenewToken.deleteMany();
  await prisma.listingFeedback.deleteMany();
  await prisma.listingRepresentative.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.representativeInfo.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.jobRecord.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.themes.deleteMany();
  await prisma.category.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();

  await Promise.all([
    fs.rm(path.join(uploadsRoot, 'users'), { recursive: true, force: true }),
    fs.rm(path.join(uploadsRoot, 'listings'), { recursive: true, force: true }),
    fs.rm(path.join(uploadsRoot, 'blogs'), { recursive: true, force: true }),
    fs.rm(path.join(uploadsRoot, 'stories'), { recursive: true, force: true }),
  ]);
}

function buildBlogContent(topic, listing, location) {
  return [
    `${topic.title} matters in ${location.city} because buyers on marketplace platforms usually decide quickly when the listing looks complete and trustworthy. Strong descriptions, accurate pricing, and honest condition notes reduce friction for both sides of the transaction.`,
    `${topic.points[0]}. ${topic.points[1]}. ${topic.points[2]}.`,
    `For a category like ${listing.title}, the best results come from matching the image, the title, and the real pickup district. That is why every listing in this seed set includes a practical address in Afghanistan rather than placeholder geography.`,
  ].join('\n\n');
}

function buildStoryDescription(user, listing, location) {
  return `${user.fullName} prepared the listing for ${listing.title} from ${location.district}, ${location.city}. The seller shared accurate condition notes, a clean product image, and a clear pickup plan, which is exactly the kind of marketplace behavior the platform wants to encourage.`;
}

async function main() {
  console.log('Seeding curated marketplace data...');

  await cleanupExistingData();

  const passwordHash = await hashPassword(defaultPassword);
  const profileImages = await sortedFiles(profileImageDir);
  const themeTemplate = await loadThemeTemplate();

  const users = [];
  const representatives = [];

  for (let index = 0; index < userSeed.length; index += 1) {
    const source = userSeed[index];
    const location = afghanLocations[index];
    const fullName = `${source.firstName} ${source.lastName}`.trim();
    const createdUser = await prisma.user.create({
      data: {
        email: source.email,
        phone: source.phone,
        firstName: source.firstName,
        lastName: source.lastName,
        fullName,
        passwordHash,
        contacts: {
          phone: source.phone,
          whatsapp: source.phone,
          telegram: source.phone,
        },
        address: userAddress(location),
        followers: [],
        metadata: {
          preferredLanguage: index % 2 === 0 ? 'fa' : 'en',
          onboardingStatus: 'verified',
          city: location.city,
          province: location.province,
          isSeedAccount: true,
        },
      },
    });

    if (profileImages.length > 0) {
      const photo = await copyProfileImage(createdUser.id, profileImages[index % profileImages.length]);
      await prisma.user.update({ where: { id: createdUser.id }, data: { photo } });
      createdUser.photo = photo;
    }

    await prisma.userRole.create({
      data: {
        userId: createdUser.id,
        role: roleForIndex(index),
      },
    });

    const representative = await prisma.representativeInfo.create({
      data: {
        userId: createdUser.id,
        region: location.province,
        whatsappNumber: source.phone,
        active: index < 8,
      },
    });

    users.push(createdUser);
    representatives.push(representative);
  }

  const categories = new Map();
  for (const category of categorySeed) {
    const createdCategory = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        parentId: category.parentSlug ? categories.get(category.parentSlug).id : null,
        isActive: true,
      },
    });
    categories.set(category.slug, createdCategory);
  }

  const listings = [];
  for (let index = 0; index < listingSeed.length; index += 1) {
    const seed = listingSeed[index];
    const seller = users[(index + 1) % users.length];
    const approver = users[0];
    const representative = representatives[index % representatives.length];
    const location = afghanLocations[index];
    const approvedAt = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + (45 + index) * 24 * 60 * 60 * 1000);

    const listing = await prisma.listing.create({
      data: {
        title: seed.title,
        description: seed.description,
        price: seed.price.toFixed(2),
        currency: 'AFN',
        listingType: seed.listingType,
        status: 'APPROVED',
        contactVisibility: 'SHOW_SELLER',
        userId: seller.id,
        categoryId: categories.get(seed.categorySlug).id,
        location: locationLabel(location),
        address: locationAddress(location),
        metadata: {
          ...seed.metadata,
          province: location.province,
          district: location.district,
          sellerCity: location.city,
        },
        approvedAt,
        approvedById: approver.id,
        expiresAt,
      },
    });

    const listingImageUrl = await copyScopedImage('listings', listing.id, seed.imageFile);
    await prisma.listingImage.create({
      data: {
        listingId: listing.id,
        url: listingImageUrl,
        position: 0,
        alt: seed.title,
      },
    });

    await prisma.listingRepresentative.create({
      data: {
        listingId: listing.id,
        representativeId: representative.id,
      },
    });

    await prisma.listingFeedback.create({
      data: {
        listingId: listing.id,
        userId: users[(index + 5) % users.length].id,
        statusAfter: 'APPROVED',
        rating: 4 + (index % 2),
        comment: seed.feedbackComment,
      },
    });

    await prisma.listingRenewToken.create({
      data: {
        listingId: listing.id,
        token: `renew-${index + 1}-${listing.id}`,
        expiresAt: new Date(Date.now() + (15 + index) * 24 * 60 * 60 * 1000),
        used: 0,
      },
    });

    await prisma.searchIndex.create({
      data: {
        listingId: listing.id,
        payload: {
          title: listing.title,
          description: listing.description,
          price: seed.price,
          category: seed.categorySlug,
          location: locationLabel(location),
          metadata: seed.metadata,
        },
        version: 1,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        title: `Listing approved: ${listing.title}`,
        message: `Your listing for ${listing.title} is now visible to buyers in ${location.city}. Please keep the price and stock information up to date.`,
        channel: index % 3 === 0 ? 'SYSTEM' : index % 3 === 1 ? 'EMAIL' : 'WHATSAPP',
        targetType: 'USER',
        senderId: approver.id,
        listingId: listing.id,
        sentAt: approvedAt,
        triggerEvent: 'LISTING_APPROVED',
        meta: {
          province: location.province,
          category: seed.categorySlug,
        },
      },
    });

    await prisma.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId: seller.id,
        deliveredAt: approvedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: approver.id,
        listingId: listing.id,
        action: 'LISTING_APPROVED',
        details: {
          title: listing.title,
          category: seed.categorySlug,
          district: location.district,
        },
        ip: `10.10.0.${index + 10}`,
      },
    });

    await prisma.jobRecord.create({
      data: {
        queue: 'search-sync',
        jobId: `search-sync-${index + 1}`,
        name: 'syncListingToSearch',
        payload: {
          listingId: listing.id,
          title: listing.title,
        },
        status: index < 18 ? 'PROCESSED' : 'ENQUEUED',
        processedAt: index < 18 ? new Date() : null,
      },
    });

    listings.push({
      ...listing,
      seed,
      seller,
      location,
      imageUrl: listingImageUrl,
    });
  }

  for (let index = 0; index < listings.length; index += 1) {
    const listing = listings[index];
    const story = await prisma.story.create({
      data: {
        title: `Seller spotlight: ${listing.seed.title}`,
        description: buildStoryDescription(listing.seller, listing.seed, listing.location),
        userId: listing.seller.id,
      },
    });

    const storyImageUrl = await copyScopedImage('stories', story.id, listing.seed.imageFile);
    await prisma.storyImage.create({
      data: {
        storyId: story.id,
        url: storyImageUrl,
        position: 0,
        alt: story.title,
      },
    });
  }

  for (let index = 0; index < blogSeed.length; index += 1) {
    const topic = blogSeed[index];
    const author = users[index % users.length];
    const listing = listings[index % listings.length];
    const blog = await prisma.blog.create({
      data: {
        title: topic.title,
        content: buildBlogContent(topic, listing.seed, listing.location),
        images: [],
        likes: 12 + index,
        shares: 2 + (index % 6),
        likedBy: [users[(index + 1) % users.length].id, users[(index + 2) % users.length].id],
        sharedBy: [users[(index + 3) % users.length].id],
        authorId: author.id,
      },
    });

    const blogImageUrl = await copyScopedImage('blogs', blog.id, topic.imageFile);
    await prisma.blog.update({
      where: { id: blog.id },
      data: { images: [blogImageUrl] },
    });

    await prisma.blogComment.create({
      data: {
        blogId: blog.id,
        authorId: users[(index + 4) % users.length].id,
        body: `Useful article. The advice about ${listing.seed.metadata.brand || listing.seed.categorySlug} listings is practical and matches what buyers ask during pickup in ${listing.location.city}.`,
      },
    });
  }

  for (let index = 0; index < contactMessages.length; index += 1) {
    const user = users[index % users.length];
    await prisma.contact.create({
      data: {
        name: user.fullName || `${user.firstName} ${user.lastName}`,
        email: user.email,
        subject:
          index % 4 === 0
            ? 'generalQuestion'
            : index % 4 === 1
              ? 'listingSupport'
              : index % 4 === 2
                ? 'accountIssue'
                : 'partnershipInquiry',
        phone: user.phone,
        message: contactMessages[index],
      },
    });
  }

  const placements = [
    'HOME_PAGE_1ST',
    'HOME_PAGE_2ND',
    'HOME_PAGE_3RD',
    'DETAIL_PAGE_1ST',
    'DETAIL_PAGE_2ND',
    'DETAIL_PAGE_SIDEBAR',
  ];
  for (let index = 0; index < 20; index += 1) {
    await prisma.ad.create({
      data: {
        title: `Marketplace campaign ${index + 1}`,
        body: `Featured marketplace campaign for ${listingSeed[index % listingSeed.length].title}.`,
        imageUrl: adImageUrls[index % adImageUrls.length],
        placement: placements[index % placements.length],
        isActive: index < 6,
      },
    });
  }

  for (let index = 0; index < themeVariants.length; index += 1) {
    const variant = themeVariants[index];
    await prisma.themes.create({
      data: {
        name: variant.name,
        tokens: makeThemePayload(themeTemplate, variant, index),
        isActive: index === 0,
      },
    });
  }

  console.log('Seed summary:');
  console.log(`  Users: ${users.length}`);
  console.log(`  Categories: ${categorySeed.length}`);
  console.log(`  Listings: ${listings.length}`);
  console.log(`  Stories: ${listings.length}`);
  console.log(`  Blogs: ${blogSeed.length}`);
  console.log(`  Contacts: ${contactMessages.length}`);
  console.log(`  Themes: ${themeVariants.length}`);
  console.log(`  Ads: 20`);
  console.log(`  Default password for seeded accounts: ${defaultPassword}`);
  console.log(`  Admin email: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());