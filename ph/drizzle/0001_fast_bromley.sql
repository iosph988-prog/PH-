CREATE TABLE `license_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`packageName` varchar(255) NOT NULL,
	`appVersion` varchar(64) NOT NULL,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int,
	`eventType` enum('created','validated','rejected','revoked','reactivated','device_linked') NOT NULL,
	`deviceId` varchar(255),
	`packageName` varchar(255),
	`appVersion` varchar(64),
	`ipAddress` varchar(64),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `license_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `license_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`keyPrefix` varchar(24) NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`expiresAt` timestamp,
	`deviceLimit` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `license_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `license_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE INDEX `license_devices_license_idx` ON `license_devices` (`licenseId`);--> statement-breakpoint
CREATE INDEX `license_devices_device_idx` ON `license_devices` (`deviceId`);--> statement-breakpoint
CREATE INDEX `license_events_license_idx` ON `license_events` (`licenseId`);--> statement-breakpoint
CREATE INDEX `license_events_created_idx` ON `license_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `license_keys_status_idx` ON `license_keys` (`status`);--> statement-breakpoint
CREATE INDEX `license_keys_expires_idx` ON `license_keys` (`expiresAt`);