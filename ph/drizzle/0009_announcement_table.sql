CREATE TABLE `announcement` (
  `id` int NOT NULL,
  `announcement` text NOT NULL,
  `url` varchar(512),
  `freeFireLogoUrl` varchar(1024),
  `freeFireMaxLogoUrl` varchar(1024),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `announcement_id` PRIMARY KEY(`id`)
);
