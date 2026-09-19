CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`cronExpression` varchar(64) NOT NULL,
	`callbackPath` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `scheduled_jobs_name_unique` UNIQUE(`name`),
	CONSTRAINT `scheduled_jobs_taskUid_unique` UNIQUE(`taskUid`)
);
