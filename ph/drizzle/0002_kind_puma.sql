CREATE TABLE `reseller_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(160),
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `reseller_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `reseller_invitations_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','reseller') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `reseller_invitations_status_idx` ON `reseller_invitations` (`status`);