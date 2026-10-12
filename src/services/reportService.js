import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const LISTING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED', 'EXPIRED', 'DRAFT', 'HIDDEN'];
const MS_PER_HOUR = 1000 * 60 * 60;

const EMPTY_SUMMARY = {
  totalListings: 0,
  pendingListings: 0,
  approvedListings: 0,
  totalUsers: 0,
  feedbackCount: 0,
  avgRating: 0,
};

function utcDayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function utcMonthKey(date) {
  return utcDayKey(date).slice(0, 7);
}

function startOfUtcDay(offsetDays = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
}

function startOfUtcMonth(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
}

function utcDayKeys(dayCount) {
  return Array.from({ length: dayCount }, (_, index) => utcDayKey(startOfUtcDay(index - (dayCount - 1))));
}

function utcMonthKeys(monthCount) {
  return Array.from({ length: monthCount }, (_, index) => utcMonthKey(startOfUtcMonth(index - (monthCount - 1))));
}

function isoWeekKey(date) {
  const value = new Date(date);
  const utc = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function listingsTypeStatus(rows, keyField, keyFor) {
  const buckets = new Map();
  for (const row of rows) {
    const bucket = keyFor(row.createdAt);
    const id = `${bucket}|${row.listingType}`;
    if (!buckets.has(id)) {
      const base = { [keyField]: bucket, type: row.listingType };
      for (const status of LISTING_STATUSES) base[status] = 0;
      buckets.set(id, base);
    }
    const entry = buckets.get(id);
    if (LISTING_STATUSES.includes(row.status)) entry[row.status] += 1;
  }
  return Array.from(buckets.values()).sort((left, right) => {
    if (left[keyField] === right[keyField]) return String(left.type).localeCompare(String(right.type));
    return left[keyField] < right[keyField] ? -1 : 1;
  });
}

async function listingsSince(start, select) {
  return prisma.listing.findMany({
    where: { createdAt: { gte: start } },
    select,
  });
}

async function isolate(label, run, fallback) {
  try {
    return await run();
  } catch (error) {
    logger.error({ err: error, report: label }, 'Admin report series failed');
    return fallback;
  }
}

export const reportService = {
  async listingsDaily(days = 30) {
    const start = startOfUtcDay(-(days - 1));
    const rows = await prisma.listing.findMany({
      where: { OR: [{ createdAt: { gte: start } }, { approvedAt: { gte: start } }] },
      select: { createdAt: true, approvedAt: true },
    });
    const created = new Map();
    const approved = new Map();
    for (const row of rows) {
      if (row.createdAt >= start) increment(created, utcDayKey(row.createdAt));
      if (row.approvedAt && row.approvedAt >= start) increment(approved, utcDayKey(row.approvedAt));
    }
    return utcDayKeys(days).map((date) => ({
      date,
      created: created.get(date) || 0,
      approved: approved.get(date) || 0,
    }));
  },

  async listingsMonthly(months = 12) {
    const rows = await listingsSince(startOfUtcMonth(-(months - 1)), { createdAt: true });
    const created = new Map();
    for (const row of rows) increment(created, utcMonthKey(row.createdAt));
    return utcMonthKeys(months).map((month) => ({ month, created: created.get(month) || 0 }));
  },

  async usersDaily(days = 30) {
    const start = startOfUtcDay(-(days - 1));
    const rows = await prisma.user.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    });
    const registered = new Map();
    for (const row of rows) increment(registered, utcDayKey(row.createdAt));
    return utcDayKeys(days).map((date) => ({ date, registered: registered.get(date) || 0 }));
  },

  async feedbackDaily(days = 30) {
    const start = startOfUtcDay(-(days - 1));
    const rows = await prisma.listingFeedback.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, rating: true },
    });
    const buckets = new Map();
    for (const row of rows) {
      const date = utcDayKey(row.createdAt);
      const bucket = buckets.get(date) || { count: 0, ratingTotal: 0, ratingCount: 0 };
      bucket.count += 1;
      if (row.rating != null) {
        bucket.ratingTotal += row.rating;
        bucket.ratingCount += 1;
      }
      buckets.set(date, bucket);
    }
    return utcDayKeys(days).map((date) => {
      const bucket = buckets.get(date);
      const avgRating = bucket?.ratingCount ? round2(bucket.ratingTotal / bucket.ratingCount) : 0;
      return { date, feedbackCount: bucket?.count || 0, avgRating };
    });
  },

  async notificationsDaily(days = 30) {
    const start = startOfUtcDay(-(days - 1));
    const rows = await prisma.notification.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, channel: true },
    });
    const buckets = new Map();
    for (const row of rows) {
      const date = utcDayKey(row.createdAt);
      const bucket = buckets.get(date) || { total: 0, email: 0, whatsapp: 0, system: 0 };
      bucket.total += 1;
      if (row.channel === 'EMAIL') bucket.email += 1;
      if (row.channel === 'WHATSAPP') bucket.whatsapp += 1;
      if (row.channel === 'SYSTEM') bucket.system += 1;
      buckets.set(date, bucket);
    }
    return utcDayKeys(days).map((date) => ({ date, ...(buckets.get(date) || { total: 0, email: 0, whatsapp: 0, system: 0 }) }));
  },

  async approvalTimeDaily(days = 30) {
    const start = startOfUtcDay(-(days - 1));
    const rows = await prisma.listing.findMany({
      where: { approvedAt: { gte: start } },
      select: { createdAt: true, approvedAt: true },
    });
    const totals = new Map();
    const counts = new Map();
    for (const row of rows) {
      if (!row.approvedAt) continue;
      const date = utcDayKey(row.approvedAt);
      const hours = (row.approvedAt.getTime() - row.createdAt.getTime()) / MS_PER_HOUR;
      increment(totals, date, hours);
      increment(counts, date);
    }
    return utcDayKeys(days).map((date) => ({
      date,
      avgHours: counts.get(date) ? round2(totals.get(date) / counts.get(date)) : 0,
    }));
  },

  async representativesByRegion(limit = 20) {
    const rows = await prisma.representativeInfo.groupBy({
      by: ['region'],
      where: { active: true },
      _count: { _all: true },
    });
    return rows
      .map((row) => ({ region: row.region, count: row._count._all }))
      .sort((left, right) => right.count - left.count)
      .slice(0, limit);
  },

  async listingsTypeStatusDaily(days = 30) {
    const rows = await listingsSince(startOfUtcDay(-(days - 1)), {
      createdAt: true,
      listingType: true,
      status: true,
    });
    return listingsTypeStatus(rows, 'day', utcDayKey);
  },

  async listingsTypeStatusWeekly(weeks = 12) {
    const rows = await listingsSince(startOfUtcDay(-(weeks * 7 - 1)), {
      createdAt: true,
      listingType: true,
      status: true,
    });
    return listingsTypeStatus(rows, 'week', isoWeekKey);
  },

  async listingsTypeStatusMonthly(months = 12) {
    const rows = await listingsSince(startOfUtcMonth(-(months - 1)), {
      createdAt: true,
      listingType: true,
      status: true,
    });
    return listingsTypeStatus(rows, 'month', utcMonthKey);
  },

  async listingsTypeStatusYearly(years = 5) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear() - (years - 1), 0, 1));
    const rows = await listingsSince(start, { createdAt: true, listingType: true, status: true });
    return listingsTypeStatus(rows, 'year', (date) => String(new Date(date).getUTCFullYear()));
  },

  async summary() {
    const [totalListings, pending, approved, totalUsers, feedbackCount, avgRatingRow] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'PENDING' } }),
      prisma.listing.count({ where: { status: 'APPROVED' } }),
      prisma.user.count(),
      prisma.listingFeedback.count(),
      prisma.listingFeedback.aggregate({
        where: { rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);
    return {
      totalListings,
      pendingListings: pending,
      approvedListings: approved,
      totalUsers,
      feedbackCount,
      avgRating: avgRatingRow._avg.rating ? round2(avgRatingRow._avg.rating) : 0,
    };
  },

  async buildAll() {
    const [
      summary,
      listingsDaily,
      listingsMonthly,
      usersDaily,
      feedbackDaily,
      notificationsDaily,
      approvalTimeDaily,
      repsRegion,
      listingsTypeStatusDaily,
      listingsTypeStatusWeekly,
      listingsTypeStatusMonthly,
      listingsTypeStatusYearly,
    ] = await Promise.all([
      isolate('summary', () => this.summary(), EMPTY_SUMMARY),
      isolate('listingsDaily', () => this.listingsDaily(), []),
      isolate('listingsMonthly', () => this.listingsMonthly(), []),
      isolate('usersDaily', () => this.usersDaily(), []),
      isolate('feedbackDaily', () => this.feedbackDaily(), []),
      isolate('notificationsDaily', () => this.notificationsDaily(), []),
      isolate('approvalTimeDaily', () => this.approvalTimeDaily(), []),
      isolate('representativesByRegion', () => this.representativesByRegion(), []),
      isolate('listingsTypeStatusDaily', () => this.listingsTypeStatusDaily(), []),
      isolate('listingsTypeStatusWeekly', () => this.listingsTypeStatusWeekly(), []),
      isolate('listingsTypeStatusMonthly', () => this.listingsTypeStatusMonthly(), []),
      isolate('listingsTypeStatusYearly', () => this.listingsTypeStatusYearly(), []),
    ]);

    return {
      summary,
      charts: {
        listingsDaily,
        listingsMonthly,
        usersDaily,
        feedbackDaily,
        notificationsDaily,
        approvalTimeDaily,
        representativesByRegion: repsRegion,
        listingsTypeStatusDaily,
        listingsTypeStatusWeekly,
        listingsTypeStatusMonthly,
        listingsTypeStatusYearly,
      },
    };
  },
};
