# EXPLAIN queries to analyze slow Prisma-generated SQL

Use these examples with your MySQL client to profile queries generated for listing lists and listing details.

-- Example: explain a list query with filters
EXPLAIN SELECT \* FROM `Listing` WHERE `status` = 'PENDING' ORDER BY `createdAt` DESC LIMIT 20;

-- Example: explain composite filter
EXPLAIN SELECT \* FROM `Listing` WHERE `status` = 'APPROVED' AND `categoryId` = 1 ORDER BY `createdAt` DESC LIMIT 20;

-- Example: explain join with ListingImage
EXPLAIN SELECT l.id, l.title, li.url FROM `Listing` l LEFT JOIN `ListingImage` li ON li.listingId = l.id WHERE l.status = 'APPROVED' ORDER BY l.createdAt DESC LIMIT 20;

-- Tips:
-- 1. Run EXPLAIN on actual queries observed in Prisma logs (enable prisma.$on('query') in staging) and paste the SQL into the DB to EXPLAIN.
-- 2. Look for full table scans (type = ALL) and high rows estimates; add indexes on columns used in WHERE/JOIN/ORDER BY.
-- 3. Use ANALYZE FORMAT=JSON (MySQL 8) for deeper insights.
