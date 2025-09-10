-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `photo` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NULL,
    `contacts` JSON NULL,
    `address` JSON NULL,
    `passwordHash` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER', 'REPRESENTATIVE') NOT NULL,

    UNIQUE INDEX `UserRole_userId_role_key`(`userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepresentativeInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `RepresentativeInfo_userId_key`(`userId`),
    INDEX `RepresentativeInfo_region_idx`(`region`),
    INDEX `RepresentativeInfo_whatsappNumber_idx`(`whatsappNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `parentId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `listingType` ENUM('RENT', 'SALE') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED', 'EXPIRED', 'DRAFT', 'HIDDEN') NOT NULL DEFAULT 'PENDING',
    `contactVisibility` ENUM('HIDE_SELLER', 'SHOW_SELLER') NOT NULL DEFAULT 'HIDE_SELLER',
    `userId` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `location` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `soldOrRentedAt` DATETIME(3) NULL,

    INDEX `Listing_createdAt_idx`(`createdAt`),
    INDEX `Listing_listingType_idx`(`listingType`),
    INDEX `Listing_status_idx`(`status`),
    INDEX `Listing_userId_idx`(`userId`),
    INDEX `Listing_categoryId_idx`(`categoryId`),
    INDEX `Listing_location_idx`(`location`),
    INDEX `Listing_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `alt` VARCHAR(191) NULL,

    INDEX `ListingImage_listingId_idx`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingRepresentative` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` VARCHAR(191) NOT NULL,
    `representativeId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ListingRepresentative_listingId_idx`(`listingId`),
    INDEX `ListingRepresentative_representativeId_idx`(`representativeId`),
    UNIQUE INDEX `ListingRepresentative_listingId_representativeId_key`(`listingId`, `representativeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingFeedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `statusAfter` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED', 'EXPIRED', 'DRAFT', 'HIDDEN') NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ListingFeedback_listingId_idx`(`listingId`),
    INDEX `ListingFeedback_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ListingRenewToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ListingRenewToken_listingId_key`(`listingId`),
    UNIQUE INDEX `ListingRenewToken_token_key`(`token`),
    INDEX `ListingRenewToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchIndex` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SearchIndex_listingId_key`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `channel` ENUM('SYSTEM', 'EMAIL', 'WHATSAPP', 'PUSH') NOT NULL DEFAULT 'SYSTEM',
    `targetType` ENUM('USER', 'ROLE', 'ALL', 'LISTING') NOT NULL,
    `senderId` VARCHAR(191) NULL,
    `listingId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `meta` JSON NULL,
    `triggerEvent` VARCHAR(191) NULL,

    INDEX `Notification_targetType_idx`(`targetType`),
    INDEX `Notification_triggerEvent_idx`(`triggerEvent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationRecipient` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notificationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'USER', 'REPRESENTATIVE') NULL,
    `readAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `deliveryError` VARCHAR(191) NULL,

    INDEX `NotificationRecipient_role_idx`(`role`),
    INDEX `NotificationRecipient_notificationId_idx`(`notificationId`),
    INDEX `NotificationRecipient_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actorId` VARCHAR(191) NULL,
    `listingId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ip` VARCHAR(191) NULL,

    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_listingId_idx`(`listingId`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `queue` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ENQUEUED',
    `lastError` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `JobRecord_jobId_key`(`jobId`),
    INDEX `JobRecord_queue_idx`(`queue`),
    INDEX `JobRecord_name_idx`(`name`),
    INDEX `JobRecord_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepresentativeInfo` ADD CONSTRAINT `RepresentativeInfo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingImage` ADD CONSTRAINT `ListingImage_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingRepresentative` ADD CONSTRAINT `ListingRepresentative_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingRepresentative` ADD CONSTRAINT `ListingRepresentative_representativeId_fkey` FOREIGN KEY (`representativeId`) REFERENCES `RepresentativeInfo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingFeedback` ADD CONSTRAINT `ListingFeedback_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingFeedback` ADD CONSTRAINT `ListingFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ListingRenewToken` ADD CONSTRAINT `ListingRenewToken_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchIndex` ADD CONSTRAINT `SearchIndex_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRecipient` ADD CONSTRAINT `NotificationRecipient_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRecipient` ADD CONSTRAINT `NotificationRecipient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
