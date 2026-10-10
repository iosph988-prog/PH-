ALTER TABLE `remote_patches` MODIFY COLUMN `section` ENUM('patches','external','texture') NOT NULL DEFAULT 'patches';
ALTER TABLE `remote_patches` ADD COLUMN `logoStorageKey` VARCHAR(512) NULL;
