#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
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

  // Create Categories
  const categories = [];
  for (let i = 0; i < 60; i++) {
    const name = `Category ${i}`;
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
  }

  // Listing Images (one per listing)
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    await prisma.listingImage.create({ data: { listingId: l.id, url: `/uploads/listings/${l.id}/img1.jpg`, position: 0 } });
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

  // Default Themes (store light + dark tokens)
  try {
    const defaultTokens = {
      id: 'next-like-001',
      name: 'Next-like Default',
      notes: 'Store as-is in a MySQL JSON column. When applying at runtime, map token css strings into CSS variables (e.g., set --background: hsl(...)). Scales provide sizes and design tokens for UI components.',
      scales: {
        font: {
          sizes: {
            lg: '18px',
            md: '16px',
            sm: '14px',
            xl: '20px',
            xs: '12px',
            '2xl': '24px',
            '3xl': '30px'
          },
          family: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
          weights: {
            bold: 700,
            medium: 500,
            regular: 400,
            semibold: 600,
            extrabold: 800
          },
          lineHeights: {
            tight: 1.1,
            normal: 1.4,
            relaxed: 1.6
          }
        },
        radii: {
          lg: '18px',
          md: '12px',
          sm: '6px',
          xl: '24px',
          round: '9999px'
        },
        shadow: {
          lg: '0 20px 60px rgba(2,6,23,0.18)',
          md: '0 6px 18px rgba(2,6,23,0.12)',
          sm: '0 1px 2px rgba(0,0,0,0.04)',
          none: 'none',
          glass: '0 8px 30px rgba(2,6,23,0.12), inset 0 -6px 20px rgba(255,255,255,0.02)'
        },
        zIndex: {
          base: 10,
          modal: 90,
          overlay: 70,
          dropdown: 60
        },
        spacing: {
          lg: '24px',
          md: '16px',
          sm: '8px',
          xl: '32px',
          xs: '4px',
          xxl: '48px'
        },
        borderWidth: {
          thin: '1px',
          thick: '2px',
          regular: '1.5px'
        },
        transitions: {
          fast: '150ms cubic-bezier(.2,.9,.2,1)',
          slow: '350ms cubic-bezier(.2,.9,.2,1)',
          normal: '250ms cubic-bezier(.2,.9,.2,1)',
          spring: {
            type: 'spring',
            damping: 30,
            stiffness: 300
          }
        }
      },
      tokens: {
        dark: {
          card: { css: 'hsl(240 10% 4%)', hsl: '240 10% 4%' },
          input: { css: 'hsl(240 3.8% 23%)', hsl: '240 3.8% 23%' },
          muted: { css: 'hsl(240 3.7% 15.9%)', hsl: '240 3.7% 15.9%' },
          accent: { css: 'hsl(260 89% 66%)', hsl: '260 89% 66%' },
          border: { css: 'hsl(240 3.8% 23%)', hsl: '240 3.8% 23%' },
          primary: { css: 'hsl(0 0% 98%)', hsl: '0 0% 98%' },
          secondary: { css: 'hsl(240 3.7% 15.9%)', hsl: '240 3.7% 15.9%' },
          background: { css: 'hsl(240 10% 4%)', hsl: '240 10% 4%' },
          foreground: { css: 'hsl(0 0% 98%)', hsl: '0 0% 98%' },
          accentForeground: { css: 'hsl(235 100% 95%)', hsl: '235 100% 95%' },
          primaryForeground: { css: 'hsl(240 10% 4%)', hsl: '240 10% 4%' },
          secondaryForeground: { css: 'hsl(0 0% 98%)', hsl: '0 0% 98%' }
        },
        light: {
          card: { css: 'hsl(0 0% 100%)', hsl: '0 0% 100%' },
          input: { css: 'hsl(240 5.9% 90%)', hsl: '240 5.9% 90%' },
          muted: { css: 'hsl(240 4.8% 95.9%)', hsl: '240 4.8% 95.9%' },
          accent: { css: 'hsl(260 89% 66%)', hsl: '260 89% 66%' },
          border: { css: 'hsl(240 5.9% 90%)', hsl: '240 5.9% 90%' },
          primary: { css: 'hsl(0 0% 7%)', hsl: '0 0% 7%' },
          secondary: { css: 'hsl(240 4.8% 95.9%)', hsl: '240 4.8% 95.9%' },
          background: { css: 'hsl(0 0% 100%)', hsl: '0 0% 100%' },
          foreground: { css: 'hsl(240 10% 3.9%)', hsl: '240 10% 3.9%' },
          accentForeground: { css: 'hsl(235 100% 95%)', hsl: '235 100% 95%' },
          primaryForeground: { css: 'hsl(0 0% 98%)', hsl: '0 0% 98%' },
          secondaryForeground: { css: 'hsl(240 10% 3.9%)', hsl: '240 10% 3.9%' }
        }
      },
      editable: true,
      createdAt: '2025-09-13T00:00:00Z',
      components: {
        card: {
          border: { token: 'border', width: 'thin' },
          radius: 'lg',
          shadow: 'md',
          background: { token: 'card' }
        },
        button: {
          primary: {
            color: { token: 'primaryForeground' },
            radius: 'md',
            shadow: 'sm',
            background: { token: 'primary' },
            transition: 'fast'
          }
        },
        navbar: {
          border: { token: 'border', width: 'regular' },
          shadow: 'none',
          background: { token: 'background' }
        }
      },
      description: 'Next.js-inspired light + dark theme tokens and scales for dynamic theming.'
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
  console.log('Seeding complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
