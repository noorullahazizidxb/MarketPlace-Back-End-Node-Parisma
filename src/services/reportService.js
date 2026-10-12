import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const LISTING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED', 'EXPIRED', 'DRAFT', 'HIDDEN'];
const RANGES = ['daily', 'weekly', 'monthly', 'yearly'];
const MS_PER_HOUR = 1000 * 60 * 60;

const EMPTY_SUMMARY = {
  totalListings: 0,
  pendingListings: 0,
  approvedListings: 0,
  totalUsers: 0,
  feedbackCount: 0,
  avgRating: 0,
};

function emptyPeriods() {
  return { daily: [], weekly: [], monthly: [], yearly: [] };
}

function utcDayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function utcMonthKey(date) {
  return utcDayKey(date).slice(0, 7);
}

function utcYearKey(date) {
  return String(new Date(date).getUTCFullYear());
}

function startOfUtcDay(offsetDays = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
}

function startOfUtcMonth(offsetMonths = 0) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
}

function yearlyStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
}

function rangeStart(range) {
  if (range === 'daily') return startOfUtcDay(-29);
  if (range === 'weekly') return startOfUtcDay(-(12 * 7 - 1));
  if (range === 'monthly') return startOfUtcMonth(-11);
  return yearlyStart();
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

function rangeKey(date, range) {
  if (range === 'daily') return utcDayKey(date);
  if (range === 'weekly') return isoWeekKey(date);
  if (range === 'monthly') return utcMonthKey(date);
  return utcYearKey(date);
}

function utcDayKeys(dayCount) {
  return Array.from({ length: dayCount }, (_, index) => utcDayKey(startOfUtcDay(index - (dayCount - 1))));
}

function utcMonthKeys(monthCount) {
  return Array.from({ length: monthCount }, (_, index) => utcMonthKey(startOfUtcMonth(index - (monthCount - 1))));
}

function weekKeys(weekCount) {
  return Array.from({ length: weekCount }, (_, index) => isoWeekKey(startOfUtcDay(-((weekCount - 1 - index) * 7))));
}

function yearKeys(yearCount) {
  const year = new Date().getUTCFullYear();
  return Array.from({ length: yearCount }, (_, index) => String(year - (yearCount - 1 - index)));
}

function rangeKeys(range) {
  if (range === 'daily') return utcDayKeys(30);
  if (range === 'weekly') return weekKeys(12);
  if (range === 'monthly') return utcMonthKeys(12);
  return yearKeys(5);
}

function increment(map, key, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function onOrAfter(date, start) {
  return date && new Date(date) >= start;
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

async function isolate(label, run, fallback) {
  try {
    return await run();
  } catch (error) {
    logger.error({ err: error, report: label }, 'Admin report series failed');
    return fallback;
  }
}

function mapRanges(rows, fill) {
  const result = {};
  for (const range of RANGES) {
    const start = rangeStart(range);
    result[range] = fill(rows.filter((row) => onOrAfter(row.createdAt, start)), range);
  }
  return result;
}

export const reportService = {
  async listingsByRange() {
    const start = rangeStart('yearly');
    const rows = await prisma.listing.findMany({
      where: { OR: [{ createdAt: { gte: start } }, { approvedAt: { gte: start } }] },
      select: { createdAt: true, approvedAt: true },
    });
    const result = {};
    for (const range of RANGES) {
      const windowStart = rangeStart(range);
      const created = new Map();
      const approved = new Map();
      for (const row of rows) {
        if (onOrAfter(row.createdAt, windowStart)) increment(created, rangeKey(row.createdAt, range));
        if (onOrAfter(row.approvedAt, windowStart)) increment(approved, rangeKey(row.approvedAt, range));
      }
      result[range] = rangeKeys(range).map((period) => ({
        period,
        created: created.get(period) || 0,
        approved: approved.get(period) || 0,
      }));
    }
    return result;
  },

  async usersByRange() {
    const rows = await prisma.user.findMany({
      where: { createdAt: { gte: rangeStart('yearly') } },
      select: { createdAt: true },
    });
    return mapRanges(rows, (windowRows, range) => {
      const registered = new Map();
      for (const row of windowRows) increment(registered, rangeKey(row.createdAt, range));
      return rangeKeys(range).map((period) => ({ period, registered: registered.get(period) || 0 }));
    });
  },

  async feedbackByRange() {
    const rows = await prisma.listingFeedback.findMany({
      where: { createdAt: { gte: rangeStart('yearly') } },
      select: { createdAt: true, rating: true },
    });
    return mapRanges(rows, (windowRows, range) => {
      const buckets = new Map();
      for (const row of windowRows) {
        const period = rangeKey(row.createdAt, range);
        const bucket = buckets.get(period) || { count: 0, ratingTotal: 0, ratingCount: 0 };
        bucket.count += 1;
        if (row.rating != null) {
          bucket.ratingTotal += row.rating;
          bucket.ratingCount += 1;
        }
        buckets.set(period, bucket);
      }
      return rangeKeys(range).map((period) => {
        const bucket = buckets.get(period);
        const avgRating = bucket?.ratingCount ? round2(bucket.ratingTotal / bucket.ratingCount) : 0;
        return { period, feedbackCount: bucket?.count || 0, avgRating };
      });
    });
  },

  async notificationsByRange() {
    const rows = await prisma.notification.findMany({
      where: { createdAt: { gte: rangeStart('yearly') } },
      select: { createdAt: true, channel: true },
    });
    return mapRanges(rows, (windowRows, range) => {
      const buckets = new Map();
      for (const row of windowRows) {
        const period = rangeKey(row.createdAt, range);
        const bucket = buckets.get(period) || { total: 0, email: 0, whatsapp: 0, system: 0 };
        bucket.total += 1;
        if (row.channel === 'EMAIL') bucket.email += 1;
        if (row.channel === 'WHATSAPP') bucket.whatsapp += 1;
        if (row.channel === 'SYSTEM') bucket.system += 1;
        buckets.set(period, bucket);
      }
      return rangeKeys(range).map((period) => ({
        period,
        ...(buckets.get(period) || { total: 0, email: 0, whatsapp: 0, system: 0 }),
      }));
    });
  },

  async approvalTimeByRange() {
    const rows = await prisma.listing.findMany({
      where: { approvedAt: { gte: rangeStart('yearly') } },
      select: { createdAt: true, approvedAt: true },
    });
    const result = {};
    for (const range of RANGES) {
      const windowStart = rangeStart(range);
      const totals = new Map();
      const counts = new Map();
      for (const row of rows) {
        if (!onOrAfter(row.approvedAt, windowStart)) continue;
        const period = rangeKey(row.approvedAt, range);
        const hours = (new Date(row.approvedAt).getTime() - new Date(row.createdAt).getTime()) / MS_PER_HOUR;
        increment(totals, period, hours);
        increment(counts, period);
      }
      result[range] = rangeKeys(range).map((period) => ({
        period,
        avgHours: counts.get(period) ? round2(totals.get(period) / counts.get(period)) : 0,
      }));
    }
    return result;
  },

  async representativesByRange(limit = 20) {
    const rows = await prisma.representativeInfo.findMany({
      where: { active: true, user: { createdAt: { gte: rangeStart('yearly') } } },
      select: { region: true, user: { select: { createdAt: true } } },
    });
    const result = {};
    for (const range of RANGES) {
      const windowStart = rangeStart(range);
      const counts = new Map();
      for (const row of rows) {
        if (!onOrAfter(row.user?.createdAt, windowStart)) continue;
        increment(counts, row.region || 'Unknown');
      }
      result[range] = [...counts.entries()]
        .map(([region, count]) => ({ region, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, limit);
    }
    return result;
  },

  async listingsTypeStatusByRange() {
    const rows = await prisma.listing.findMany({
      where: { createdAt: { gte: rangeStart('yearly') } },
      select: { createdAt: true, listingType: true, status: true },
    });
    const keyFor = {
      daily: utcDayKey,
      weekly: isoWeekKey,
      monthly: utcMonthKey,
      yearly: utcYearKey,
    };
    const keyField = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
    const result = {};
    for (const range of RANGES) {
      const windowRows = rows.filter((row) => onOrAfter(row.createdAt, rangeStart(range)));
      result[range] = listingsTypeStatus(windowRows, keyField[range], keyFor[range]);
    }
    return result;
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
      listings,
      users,
      feedback,
      notifications,
      approvalTime,
      representativesByRegion,
      listingsTypeStatus,
    ] = await Promise.all([
      isolate('summary', () => this.summary(), EMPTY_SUMMARY),
      isolate('listings', () => this.listingsByRange(), emptyPeriods()),
      isolate('users', () => this.usersByRange(), emptyPeriods()),
      isolate('feedback', () => this.feedbackByRange(), emptyPeriods()),
      isolate('notifications', () => this.notificationsByRange(), emptyPeriods()),
      isolate('approvalTime', () => this.approvalTimeByRange(), emptyPeriods()),
      isolate('representativesByRegion', () => this.representativesByRange(), emptyPeriods()),
      isolate('listingsTypeStatus', () => this.listingsTypeStatusByRange(), emptyPeriods()),
    ]);

    return {
      summary,
      charts: {
        listings,
        users,
        feedback,
        notifications,
        approvalTime,
        representativesByRegion,
        listingsTypeStatus,
        listingsDaily: (listings.daily || []).map((point) => ({
          date: point.period,
          created: point.created,
          approved: point.approved,
        })),
        listingsMonthly: (listings.monthly || []).map((point) => ({
          month: point.period,
          created: point.created,
        })),
        usersDaily: (users.daily || []).map((point) => ({
          date: point.period,
          registered: point.registered,
        })),
        feedbackDaily: (feedback.daily || []).map((point) => ({
          date: point.period,
          feedbackCount: point.feedbackCount,
          avgRating: point.avgRating,
        })),
        notificationsDaily: (notifications.daily || []).map((point) => ({
          date: point.period,
          total: point.total,
          email: point.email,
          whatsapp: point.whatsapp,
          system: point.system,
        })),
        approvalTimeDaily: (approvalTime.daily || []).map((point) => ({
          date: point.period,
          avgHours: point.avgHours,
        })),
        listingsTypeStatusDaily: listingsTypeStatus.daily || [],
        listingsTypeStatusWeekly: listingsTypeStatus.weekly || [],
        listingsTypeStatusMonthly: listingsTypeStatus.monthly || [],
        listingsTypeStatusYearly: listingsTypeStatus.yearly || [],
      },
    };
  },
};
