import { prisma } from '../config/prisma.js';

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    // Already a string; attempt to standardize (assumes first 10 chars are YYYY-MM-DD when ISO)
    return date.length >= 10 ? date.slice(0, 10) : date;
  }
  return date.toISOString().slice(0,10); // YYYY-MM-DD
}

function dateRangeDays(days) {
  const out = [];
  const today = new Date();
  // ensure last day is today
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(formatDate(d));
  }
  return out;
}

function fillSeries(baseDates, rows, keyMap) {
  const byDate = new Map();
  for (const r of rows) byDate.set(r.d, r);
  return baseDates.map(d => {
    const src = byDate.get(d) || {};
    const obj = { date: d };
    for (const [targetKey, sourceKey] of Object.entries(keyMap)) {
      obj[targetKey] = src[sourceKey] !== undefined && src[sourceKey] !== null ? Number(src[sourceKey]) : 0;
    }
    return obj;
  });
}

export const reportService = {
  async listingsDaily(days = 30) {
    const rowsCreated = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') d, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    const rowsApproved = await prisma.$queryRaw`SELECT DATE_FORMAT(approvedAt, '%Y-%m-%d') d, COUNT(*) c FROM Listing WHERE approvedAt IS NOT NULL AND approvedAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    const rowsByDate = {};
    for (const r of rowsCreated) rowsByDate[r.d] = { date: r.d, created: Number(r.c) };
    for (const r of rowsApproved) {
      rowsByDate[r.d] = rowsByDate[r.d] || { date: r.d };
      rowsByDate[r.d].approved = Number(r.c);
    }
    const baseDates = dateRangeDays(days);
    return baseDates.map(d => ({ date: d, created: rowsByDate[d]?.created || 0, approved: rowsByDate[d]?.approved || 0 }));
  },
  async listingsMonthly(months = 12) {
    const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m') ym, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH) GROUP BY ym ORDER BY ym`;
    return rows.map(r => ({ month: r.ym, created: Number(r.c) }));
  },
  async usersDaily(days = 30) {
    const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') d, COUNT(*) c FROM User WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    return fillSeries(dateRangeDays(days), rows, { registered: 'c' });
  },
  async feedbackDaily(days = 30) {
    const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') d, COUNT(*) feedbackCount, AVG(rating) avgRating FROM ListingFeedback WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    const base = dateRangeDays(days);
    const map = new Map(rows.map(r => [r.d, r]));
    return base.map(d => {
      const r = map.get(d) || {};
      return { date: d, feedbackCount: Number(r.feedbackCount || 0), avgRating: r.avgRating ? Number(Number(r.avgRating).toFixed(2)) : 0 };
    });
  },
  async notificationsDaily(days = 30) {
    const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') d, COUNT(*) total, SUM(channel='EMAIL') emailCount, SUM(channel='WHATSAPP') whatsappCount, SUM(channel='SYSTEM') systemCount FROM Notification WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    const base = dateRangeDays(days);
    const map = new Map(rows.map(r => [r.d, r]));
    return base.map(d => {
      const r = map.get(d) || {};
      return { date: d, total: Number(r.total || 0), email: Number(r.emailCount || 0), whatsapp: Number(r.whatsappCount || 0), system: Number(r.systemCount || 0) };
    });
  },
  async approvalTimeDaily(days = 30) {
    const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(approvedAt, '%Y-%m-%d') d, AVG(TIMESTAMPDIFF(HOUR, createdAt, approvedAt)) avgHours FROM Listing WHERE approvedAt IS NOT NULL AND approvedAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d ORDER BY d`;
    return fillSeries(dateRangeDays(days), rows, { avgHours: 'avgHours' });
  },
  async representativesByRegion(limit = 20) {
    const rows = await prisma.$queryRaw`SELECT region, COUNT(*) c FROM RepresentativeInfo WHERE active = 1 GROUP BY region ORDER BY c DESC LIMIT ${limit}`;
    return rows.map(r => ({ region: r.region, count: Number(r.c) }));
  },
  async summary() {
    const [totalListings, pending, approved, totalUsers, feedbackCount, avgRatingRow] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'PENDING' } }),
      prisma.listing.count({ where: { status: 'APPROVED' } }),
      prisma.user.count(),
      prisma.listingFeedback.count(),
      prisma.$queryRaw`SELECT AVG(rating) avgRating FROM ListingFeedback WHERE rating IS NOT NULL`
    ]);
    const avgRating = Array.isArray(avgRatingRow) ? (avgRatingRow[0]?.avgRating ? Number(Number(avgRatingRow[0].avgRating).toFixed(2)) : 0) : 0;
    return { totalListings, pendingListings: pending, approvedListings: approved, totalUsers, feedbackCount, avgRating };
  },
  async buildAll() {
    const [summary, listingsDaily, listingsMonthly, usersDaily, feedbackDaily, notificationsDaily, approvalTimeDaily, repsRegion,
      listingsTypeStatusDaily, listingsTypeStatusWeekly, listingsTypeStatusMonthly, listingsTypeStatusYearly] = await Promise.all([
      this.summary(),
      this.listingsDaily(),
      this.listingsMonthly(),
      this.usersDaily(),
      this.feedbackDaily(),
      this.notificationsDaily(),
      this.approvalTimeDaily(),
      this.representativesByRegion(),
      this.listingsTypeStatusDaily?.() || this._listingsTypeStatusDaily(),
      this.listingsTypeStatusWeekly?.() || this._listingsTypeStatusWeekly(),
      this.listingsTypeStatusMonthly?.() || this._listingsTypeStatusMonthly(),
      this.listingsTypeStatusYearly?.() || this._listingsTypeStatusYearly()
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
        listingsTypeStatusYearly
      }
    };
  }
};

// ---- Extended listing type + status aggregations ----
// We attach them after export to avoid cluttering the main object definition above.
const LISTING_STATUSES = ['PENDING','APPROVED','REJECTED','SOLD','RENTED','EXPIRED','DRAFT','HIDDEN'];

function pivotTypeStatusRows(rows, keyField) {
  // rows: [{ keyField: '2025-10-02', listingType: 'RENT', status: 'PENDING', c: 5 }, ...]
  const map = new Map();
  for (const r of rows) {
    const key = `${r[keyField]}|${r.listingType}`;
    if (!map.has(key)) {
      const base = { [keyField]: r[keyField], type: r.listingType };
      for (const s of LISTING_STATUSES) base[s] = 0;
      map.set(key, base);
    }
    const obj = map.get(key);
    if (LISTING_STATUSES.includes(r.status)) obj[r.status] = Number(r.c);
  }
  return Array.from(map.values()).sort((a,b) => {
    if (a[keyField] === b[keyField]) return a.type.localeCompare(b.type);
    return a[keyField] < b[keyField] ? -1 : 1;
  });
}

reportService._listingsTypeStatusDaily = async function(days = 30) {
  const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') d, listingType, status, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY) GROUP BY d, listingType, status ORDER BY d`;
  return pivotTypeStatusRows(rows.map(r => ({ ...r, day: r.d })), 'day');
};

reportService._listingsTypeStatusWeekly = async function(weeks = 12) {
  // YEARWEEK returns e.g. 202540 for week 40 of 2025; format to YYYY-Www for readability
  const rows = await prisma.$queryRaw`SELECT YEARWEEK(createdAt, 1) yw, listingType, status, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${weeks} WEEK) GROUP BY yw, listingType, status ORDER BY yw`;
  const normalized = rows.map(r => {
    const yw = String(r.yw); // e.g., 202540
    const year = yw.slice(0,4);
    const weekNum = yw.slice(4);
    return { week: `${year}-W${weekNum}`, listingType: r.listingType, status: r.status, c: r.c };
  });
  return pivotTypeStatusRows(normalized, 'week');
};

reportService._listingsTypeStatusMonthly = async function(months = 12) {
  const rows = await prisma.$queryRaw`SELECT DATE_FORMAT(createdAt, '%Y-%m') ym, listingType, status, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH) GROUP BY ym, listingType, status ORDER BY ym`;
  const normalized = rows.map(r => ({ month: r.ym, listingType: r.listingType, status: r.status, c: r.c }));
  return pivotTypeStatusRows(normalized, 'month');
};

reportService._listingsTypeStatusYearly = async function(years = 5) {
  const rows = await prisma.$queryRaw`SELECT YEAR(createdAt) y, listingType, status, COUNT(*) c FROM Listing WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL ${years} YEAR) GROUP BY y, listingType, status ORDER BY y`;
  const normalized = rows.map(r => ({ year: String(r.y), listingType: r.listingType, status: r.status, c: r.c }));
  return pivotTypeStatusRows(normalized, 'year');
};
