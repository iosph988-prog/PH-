CREATE TABLE `remote_patch_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patchId` int NOT NULL,
	`version` int NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`sizeBytes` int NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `remote_patch_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `remote_patches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(96) NOT NULL,
	`title` varchar(160) NOT NULL,
	`game` varchar(64) NOT NULL,
	`currentVersionId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `remote_patches_id` PRIMARY KEY(`id`),
	CONSTRAINT `remote_patches_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `remote_patch_versions_patch_idx` ON `remote_patch_versions` (`patchId`);--> statement-breakpoint
CREATE INDEX `remote_patch_versions_status_idx` ON `remote_patch_versions` (`status`);--> statement-breakpoint
CREATE INDEX `remote_patches_game_idx` ON `remote_patches` (`game`);