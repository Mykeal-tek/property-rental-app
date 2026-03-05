CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`landlordId` int NOT NULL,
	`checkInDate` timestamp NOT NULL,
	`checkOutDate` timestamp NOT NULL,
	`numberOfGuests` int NOT NULL,
	`totalPrice` decimal(10,2) NOT NULL,
	`status` enum('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`bookingId` int NOT NULL,
	`tenantId` int NOT NULL,
	`landlordId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('damage','cleanliness','maintenance','safety','other') NOT NULL,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`images` json,
	`complaintStatus` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('booking_request','booking_approved','booking_rejected','payment_due','complaint_filed','complaint_resolved','review_posted') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`relatedId` int,
	`relatedType` varchar(50),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`depositAmount` decimal(10,2) NOT NULL,
	`paymentType` enum('deposit','full_payment','partial_payment') NOT NULL,
	`paymentStatus` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`stripeChargeId` varchar(255),
	`dueDate` timestamp,
	`paidDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`landlordId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL,
	`zipCode` varchar(20) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`pricePerNight` decimal(10,2) NOT NULL,
	`bedrooms` int NOT NULL,
	`bathrooms` decimal(3,1) NOT NULL,
	`squareFeet` int,
	`propertyType` enum('apartment','house','condo','townhouse','studio') NOT NULL,
	`amenities` json,
	`images` json,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`maxGuests` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propertyAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`date` timestamp NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propertyAvailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`bookingId` int NOT NULL,
	`tenantId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','landlord','tenant') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `profileImage` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
CREATE INDEX `property_idx` ON `bookings` (`propertyId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `bookings` (`tenantId`);--> statement-breakpoint
CREATE INDEX `landlord_idx` ON `bookings` (`landlordId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE INDEX `property_idx` ON `complaints` (`propertyId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `complaints` (`tenantId`);--> statement-breakpoint
CREATE INDEX `landlord_idx` ON `complaints` (`landlordId`);--> statement-breakpoint
CREATE INDEX `complaint_status_idx` ON `complaints` (`complaintStatus`);--> statement-breakpoint
CREATE INDEX `tenant_property_idx` ON `favorites` (`tenantId`,`propertyId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `favorites` (`tenantId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `isRead_idx` ON `notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `booking_idx` ON `payments` (`bookingId`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `payments` (`paymentStatus`);--> statement-breakpoint
CREATE INDEX `landlord_idx` ON `properties` (`landlordId`);--> statement-breakpoint
CREATE INDEX `city_idx` ON `properties` (`city`);--> statement-breakpoint
CREATE INDEX `available_idx` ON `properties` (`isAvailable`);--> statement-breakpoint
CREATE INDEX `property_date_idx` ON `propertyAvailability` (`propertyId`,`date`);--> statement-breakpoint
CREATE INDEX `property_idx` ON `reviews` (`propertyId`);--> statement-breakpoint
CREATE INDEX `tenant_idx` ON `reviews` (`tenantId`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);