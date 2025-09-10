-- Migration: add useful indexes to improve query performance
-- Run locally with: npx prisma migrate deploy (or npx prisma migrate dev)
ALTER TABLE `Listing`
ADD INDEX `idx_listing_price` (`price`),
    ADD INDEX `idx_listing_status_createdAt` (`status`, `createdAt`);
ALTER TABLE `User`
ADD INDEX `idx_user_email` (`email`);
-- If using MySQL with InnoDB, ensure indexes fit within column limits for varchars.