ALTER TABLE `remote_patches` ADD `section` enum('patches','external') NOT NULL DEFAULT 'patches';--> statement-breakpoint
ALTER TABLE `remote_patches` ADD `interfaceTab` varchar(64);
