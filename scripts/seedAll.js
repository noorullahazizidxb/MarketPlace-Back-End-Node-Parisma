#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Queue } = require('bullmq');
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rndChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function randText(words = 6) {
  const w = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split(' ');
  let out = [];
  for (let i = 0; i < words; i++) out.push(rndChoice(w));
  return out.join(' ');
}

async function main() {
  console.log('Seeding demo data...');

  // Clean existing small sets (optional safe truncate)
  // WARNING: in production, be careful with deleteMany
  // New content first (children before parents)
  try { await prisma.storyImage.deleteMany(); } catch (e) {}
  try { await prisma.story.deleteMany(); } catch (e) {}
  try { await prisma.blogComment.deleteMany(); } catch (e) {}
  try { await prisma.blog.deleteMany(); } catch (e) {}
  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.searchIndex.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listingRepresentative.deleteMany();
  await prisma.listingFeedback.deleteMany();
  await prisma.listingRenewToken.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.representativeInfo.deleteMany();
  await prisma.category.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.jobRecord.deleteMany();
  try { await prisma.ad.deleteMany(); } catch (e) {}
  // Also clear uploaded listing images directory so we don't accumulate stale files across seeds
  try {
    await fs.rm(path.resolve(process.cwd(), 'uploads', 'listings'), { recursive: true, force: true });
  } catch (e) {}
  // Clear uploads for stories and blogs as well
  try {
    await fs.rm(path.resolve(process.cwd(), 'uploads', 'stories'), { recursive: true, force: true });
  } catch (e) {}
  try {
    await fs.rm(path.resolve(process.cwd(), 'uploads', 'blogs'), { recursive: true, force: true });
  } catch (e) {}

  // Create Users
  const users = [];
  for (let i = 0; i < 60; i++) {
    const email = `user${i}@example.com`;
    const rawPassword = 'password123';
    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    const firstName = `User${i}`;
    const lastName = 'Seed';
    const fullName = `${firstName} ${lastName}`;
    const phone = `+93000000${1000 + i}`;
    const contacts = { phone, whatsapp: phone };
    const address = { street: `Street ${i}`, city: `City-${randInt(1,20)}`, country: 'AF' };
    const u = await prisma.user.create({ data: { email, phone, passwordHash, photo: null, firstName, lastName, fullName, contacts, address } });
    users.push(u);
  }

  // Create role assignments for seeded users
  // Assign: 1 ADMIN (first user), 5 REPRESENTATIVES (next 5), rest USER
  const adminUser = users[0];
  await prisma.userRole.create({ data: { userId: adminUser.id, role: 'ADMIN' } });

  const repCount = 5;
  const repUsers = users.slice(1, 1 + repCount);
  for (const ru of repUsers) {
    await prisma.userRole.create({ data: { userId: ru.id, role: 'REPRESENTATIVE' } });
  }

  for (const u of users) {
    if (u.id === adminUser.id) continue;
    if (repUsers.some(r => r.id === u.id)) continue;
    await prisma.userRole.create({ data: { userId: u.id, role: 'USER' } });
  }

  // Create Categories (restricted list, <= 50 total; we only add specified 8)
  const categoryNames = [
    'Real State',
    'Vehicles',
    'Mobile & Electronic',
    'Home & Office Appliances',
    'Machinary',
    'Personal Accessories',
    'Food Items',
    'Animal & Livestock'
  ];
  const categories = [];
  for (const rawName of categoryNames) {
    const name = rawName.trim();
    const c = await prisma.category.create({ data: { name, slug: slugify(name) } });
    categories.push(c);
  }

  // Create Representatives (bind to some users)
  const reps = [];
  for (let i = 0; i < 60; i++) {
    const userRef = users[i];
    const r = await prisma.representativeInfo.create({ data: { userId: userRef.id, region: `Region-${randInt(1,10)}`, whatsappNumber: `+93${100000000 + i}`, active: true } });
    reps.push(r);
  }

  // Prepare seed image candidates (from Seed_Images directory). Fallback to root photo.jpg if none.
  const seedImagesDir = path.resolve(process.cwd(), 'Seed_Images');
  let seedImages = [];
  try {
    const files = await fs.readdir(seedImagesDir);
    const exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
    seedImages = files
      .filter(f => exts.has(path.extname(f).toLowerCase()))
      .map(f => path.join(seedImagesDir, f));
  } catch (e) {
    // directory might not exist; ignore
  }
  // fallback single sample image in repo root
  const fallbackImage = path.resolve(process.cwd(), 'photo.jpg');
  try { await fs.stat(fallbackImage); } catch (e) {}

  // Create Listings
  const listings = [];
  for (let i = 0; i < 60; i++) {
    const userRef = rndChoice(users);
    const cat = rndChoice(categories);
    const listing = await prisma.listing.create({ data: {
      title: `Listing ${i} ${randText(3)}`,
      description: randText(20),
      price: (randInt(1,999) + 0.99),
      currency: 'AFN',
      listingType: i % 2 === 0 ? 'SALE' : 'RENT',
      status: 'APPROVED',
      contactVisibility: 'SHOW_SELLER',
      userId: userRef.id,
      categoryId: cat.id,
      location: `City-${randInt(1,20)}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }});
    listings.push(listing);

    // Attach at least 2 images copied into uploads/listings/<id>/
    try {
      const destDir = path.resolve(process.cwd(), 'uploads', 'listings', listing.id);
      await fs.mkdir(destDir, { recursive: true });
      const picks = [];
      const choose = () => {
        if (seedImages && seedImages.length >= 1) {
          return seedImages[Math.floor(Math.random() * seedImages.length)];
        }
        return fallbackImage;
      };
      // ensure at least two picks (can repeat if only one candidate)
      picks.push(choose());
      picks.push(choose());
      let position = 0;
      for (let p = 0; p < picks.length; p++) {
        const src = picks[p];
        const ext = path.extname(src) || '.jpg';
        const fileName = `img${p+1}${ext}`;
        const destPath = path.join(destDir, fileName);
        try {
          await fs.copyFile(src, destPath);
        } catch (e) {
          // if copy fails, continue to next
        }
        const url = `/uploads/listings/${listing.id}/${fileName}`;
        try {
          await prisma.listingImage.create({ data: { listingId: listing.id, url, position: position++ } });
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Failed to attach images for listing', listing.id, e.message);
    }
  }

  // ------------------------------
  // Seed Stories (admin-only creator)
  // ------------------------------
  const stories = [];
  for (let i = 0; i < 20; i++) {
    const title = `Story ${i + 1}: ${randText(3)}`;
    const description = randText(30);
    const videoMaybe = Math.random() < 0.25 ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null;
    const s = await prisma.story.create({ data: { title, description, videoUrl: videoMaybe, userId: adminUser.id } });
    stories.push(s);
    // Attach images copied into uploads/stories/<id>/
    try {
      const destDir = path.resolve(process.cwd(), 'uploads', 'stories', s.id);
      await fs.mkdir(destDir, { recursive: true });
      const picks = [];
      const choose = () => {
        if (seedImages && seedImages.length >= 1) {
          return seedImages[Math.floor(Math.random() * seedImages.length)];
        }
        return fallbackImage;
      };
      picks.push(choose());
      picks.push(choose());
      let position = 0;
      for (let p = 0; p < picks.length; p++) {
        const src = picks[p];
        const ext = path.extname(src) || '.jpg';
        const fileName = `img${p + 1}${ext}`;
        const destPath = path.join(destDir, fileName);
        try { await fs.copyFile(src, destPath); } catch (e) {}
        const url = `/uploads/stories/${s.id}/${fileName}`;
        try { await prisma.storyImage.create({ data: { storyId: s.id, url, position: position++ } }); } catch (e) {}
      }
    } catch (e) {
      console.warn('Failed to attach images for story', s.id, e.message);
    }
  }

  // ------------------------------
  // Seed Blogs (any user author)
  // ------------------------------
  const blogs = [];
  for (let i = 0; i < 20; i++) {
    const author = rndChoice(users);
    const title = `Blog ${i + 1}: ${randText(4)}`;
    const content = `${randText(80)}\n\n${randText(80)}`;
    // Prepare blog images: copy to uploads/blogs/<id>/ after blog create (need id)
    // Create with temporary empty images, then update
    let blog = await prisma.blog.create({ data: { title, content, images: [], authorId: author.id } });
    try {
      const destDir = path.resolve(process.cwd(), 'uploads', 'blogs', blog.id);
      await fs.mkdir(destDir, { recursive: true });
      const picks = [];
      const choose = () => {
        if (seedImages && seedImages.length >= 1) {
          return seedImages[Math.floor(Math.random() * seedImages.length)];
        }
        return fallbackImage;
      };
      // choose 2-3 images
      const num = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let p = 0; p < num; p++) picks.push(choose());
      const urls = [];
      for (let p = 0; p < picks.length; p++) {
        const src = picks[p];
        const ext = path.extname(src) || '.jpg';
        const fileName = `img${p + 1}${ext}`;
        const destPath = path.join(destDir, fileName);
        try { await fs.copyFile(src, destPath); } catch (e) {}
        const url = `/uploads/blogs/${blog.id}/${fileName}`;
        urls.push(url);
      }
      blog = await prisma.blog.update({ where: { id: blog.id }, data: { images: urls, likes: randInt(0, 50), shares: randInt(0, 20) } });
    } catch (e) {
      console.warn('Failed to attach images for blog', blog.id, e.message);
    }
    // Seed some comments
    const commentCount = randInt(0, 5);
    for (let c = 0; c < commentCount; c++) {
      try {
        await prisma.blogComment.create({ data: { blogId: blog.id, authorId: rndChoice(users).id, body: randText(12) } });
      } catch (e) {}
    }
    blogs.push(blog);
  }


  // ListingRepresentative assignments
  for (let i = 0; i < 60; i++) {
    const l = rndChoice(listings);
    const rep = rndChoice(reps);
    try {
      await prisma.listingRepresentative.create({ data: { listingId: l.id, representativeId: rep.id } });
    } catch (e) { /* ignore duplicates */ }
  }

  // ListingFeedback
  for (let i = 0; i < 60; i++) {
    const l = rndChoice(listings);
    const u = rndChoice(users);
  const rating = randInt(1, 5);
  await prisma.listingFeedback.create({ data: { listingId: l.id, userId: u.id, statusAfter: 'APPROVED', rating, comment: randText(8) } });
  }

  // ListingRenewToken (one per listing)
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    await prisma.listingRenewToken.create({ data: { listingId: l.id, token: `token-${l.id}`, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } });
  }

  // SearchIndex entries
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    await prisma.searchIndex.create({ data: { listingId: l.id, payload: { title: l.title, description: l.description }, version: 1 } });
  }

  // Notifications + recipients
  for (let i = 0; i < 60; i++) {
    const n = await prisma.notification.create({ data: { title: `Notice ${i}`, message: randText(6), channel: 'SYSTEM', targetType: 'USER' } });
    await prisma.notificationRecipient.create({ data: { notificationId: n.id, userId: rndChoice(users).id } });
  }

  // Audit logs
  for (let i = 0; i < 60; i++) {
    await prisma.auditLog.create({ data: { actorId: rndChoice(users).id, listingId: rndChoice(listings).id, action: 'SEED', details: { msg: 'seed' } } });
  }

  // Job records
  for (let i = 0; i < 60; i++) {
    await prisma.jobRecord.create({ data: { queue: 'seed', jobId: `job-${i}-${Date.now()}`, name: 'seed-job', payload: { i } } });
  }

  // Ads (one or more per placement)
  try {
    const placements = [
      'HOME_PAGE_1ST','HOME_PAGE_2ND','HOME_PAGE_3RD',
      'DETAIL_PAGE_1ST','DETAIL_PAGE_2ND','DETAIL_PAGE_SIDEBAR'
    ];
    const sampleImages = [
      'http://cdn.4imprint.com/qtz/headers/supergroups/193/img/tech040621.webp',
      'https://picsum.photos/seed/ad2/300/250',
      'https://picsum.photos/seed/ad3/600/160',
      'https://picsum.photos/seed/ad4/320/100',
      'https://picsum.photos/seed/ad5/468/60',
      'https://picsum.photos/seed/ad6/200/200'
    ];
    for (const p of placements) {
      const count = randInt(1,2); // 1-2 ads per placement
      for (let i = 0; i < count; i++) {
        await prisma.ad.create({ data: {
          title: `${p.replace(/_/g,' ')} Ad ${i+1}`,
          body: randText(12),
          imageUrl: rndChoice(sampleImages) + `?v=${randInt(1,9999)}`,
          placement: p,
          isActive: true
        }});
      }
    }
  } catch (e) {
    console.warn('Skipping ads seed:', e.message);
  }

  // Default Themes (store light + dark tokens)
  try {
    const defaultTokens = { 
    "id": 1,
    "name": "default",
    "scales": {"font": {"sizes": {"lg": "16px","md": "14px","sm": "12px","xl": "18px","xs": "10px","2xl": "22px","3xl": "28px","base": "13px"},"family": "\"Inter\", system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial","weights": {"bold": "600","medium": "400","regular": "300","semibold": "500","extrabold": "700"},"lineHeights": {"tight": "1.1","normal": "1.3","relaxed": "1.5"}},"radii": {"lg": "18px","md": "12px","sm": "6px","xl": "24px","round": "9999px"},"shadow": {"lg": "0 20px 60px rgba(2,6,23,0.18)","md": "0 6px 18px rgba(2,6,23,0.12)","sm": "0 1px 2px rgba(0,0,0,0.04)","none": "none","glass": "0 8px 30px rgba(2,6,23,0.12), inset 0 -6px 20px rgba(255,255,255,0.02)"},"zIndex": {"base": 10,"modal": 90,"overlay": 70,"dropdown": 60},"spacing": {"lg": "24px","md": "16px","sm": "8px","xl": "32px","xs": "4px","xxl": "48px"},"borderWidth": {"thin": "1px","thick": "2px","regular": "1.5px"},"transitions": {"fast": "150ms cubic-bezier(.2,.9,.2,1)","slow": "350ms cubic-bezier(.2,.9,.2,1)","normal": "250ms cubic-bezier(.2,.9,.2,1)","spring": {"type": "spring","damping": 30,"stiffness": 300}}},
    "tokens": {"dark": {"card": {"css": "hsl(240 10% 4%)","hsl": [240,10,4]},"input": {"css": "hsl(240 3.8% 23%)","hsl": [240,4,23]},"muted": {"css": "hsl(240 3.7% 15.9%)","hsl": [240,4,16]},"accent": {"css": "hsl(260 89% 66%)","hsl": [260,89,66]},"border": {"css": "hsl(240 3.8% 23%)","hsl": [240,4,23]},"primary": {"css": "hsl(0 0% 98%)","hsl": [0,0,98]},"secondary": {"css": "hsl(240 3.7% 15.9%)","hsl": [240,4,16]},"background": {"css": "hsl(240 10% 4%)","hsl": [240,10,4]},"foreground": {"css": "hsl(0 0% 98%)","hsl": [0,0,98]},"accentForeground": {"css": "hsl(235 100% 95%)","hsl": [235,100,95]},"primaryForeground": {"css": "hsl(240 10% 4%)","hsl": [240,10,4]},"secondaryForeground": {"css": "hsl(0 0% 98%)","hsl": [0,0,98]}},"light": {"card": {"css": "hsl(0 0% 100%)","hsl": [0,0,100]},"input": {"css": "hsl(240 5.9% 90%)","hsl": [240,6,90]},"muted": {"css": "hsl(240 4.8% 95.9%)","hsl": [240,5,96]},"accent": {"css": "hsl(260 89% 66%)","hsl": [260,89,66]},"border": {"css": "hsl(240 5.9% 90%)","hsl": [240,6,90]},"primary": {"css": "hsl(0 0% 7%)","hsl": [0,0,7]},"secondary": {"css": "hsl(240 4.8% 95.9%)","hsl": [240,5,96]},"background": {"css": "hsl(0 0% 100%)","hsl": [0,0,100]},"foreground": {"css": "hsl(240 10% 3.9%)","hsl": [240,10,4]},"accentForeground": {"css": "hsl(235 100% 95%)","hsl": [235,100,95]},"primaryForeground": {"css": "hsl(0 0% 98%)","hsl": [0,0,98]},"secondaryForeground": {"css": "hsl(240 10% 3.9%)","hsl": [240,10,4]}}},
    "components": {"card": {"border": {"token": "border","width": "thin"},"radius": "lg","shadow": "sm","background": {"token": "card"}},"link": {"color": {"token": "foreground"},"underline": {"token": "primaryForeground"},"background": {"token": "accent"},"hoverColor": {"token": "primary"},"activeColor": {"token": "primary"},"hoverBackground": {"token": "linkBg"}},"button": {"accent": {"radius": "md","hoverShadow": "md","activeShadow": "lg","hoverBackground": {"token": "accent"},"activeBackground": {"token": "accent"}},"primary": {"color": {"token": "primaryForeground"},"radius": "md","shadow": "sm","background": {"token": "primary"},"transition": "fast","hoverShadow": "md","activeShadow": "lg","hoverBackground": {"token": "accent"},"activeBackground": {"token": "accent"}},"secondary": {"radius": "md","hoverShadow": "md","activeShadow": "lg","hoverBackground": {"token": "accent"},"activeBackground": {"token": "accent"}}},"navbar": {"border": {"token": "border","width": "thick"},"shadow": "sm","background": {"token": "background"}}}
  };
  await prisma.themes.create({ data: { name: 'default', tokens: defaultTokens, isActive: true } });
  } catch (e) {
    // Non-fatal: if Themes table doesn't exist yet, skip
    console.warn('Skipping theme seed:', e.message);
  }

  // Helpful info for the developer: seeded admin / representatives
  console.log('Seed summary:');
  console.log('  Admin account:', adminUser.email, '(password: password123)');
  console.log('  Representative samples:', repUsers.slice(0, 5).map(r => r.email));
  console.log('  Stories:', stories.length);
  console.log('  Blogs:', blogs.length);

  // Optionally enqueue a one-off cleanup job (stories/blogs) variable days ahead to demonstrate job pipeline
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
    const contentQueue = new Queue('content-cleanup', { connection });
    const days = parseInt(process.env.SEED_CONTENT_CLEANUP_DAYS || '45', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    await contentQueue.add('seeded-content-cleanup', { cutoff: cutoff.toISOString(), types: ['story','blog'] }, { jobId: `seed-content-cleanup-${Date.now()}` });
    console.log(`  Enqueued content cleanup job for items older than ${days} days.`);
    await connection.quit();
  } catch (e) {
    console.warn('Could not enqueue content cleanup job:', e?.message);
  }
  console.log('Seeding complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
