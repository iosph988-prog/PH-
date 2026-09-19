ALTER TABLE `license_keys` ADD `durationDays` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `license_keys` ADD `activatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `license_keys_activated_idx` ON `license_keys` (`activatedAt`);