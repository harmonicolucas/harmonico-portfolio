CREATE TABLE `app_kv` (
	`k` varchar(64) NOT NULL,
	`v` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_kv_k` PRIMARY KEY(`k`)
);
--> statement-breakpoint
CREATE TABLE `content_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('publish','import','restore','seed','backup') NOT NULL,
	`note` varchar(300),
	`data` json NOT NULL,
	`createdBy` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`kind` enum('image','video','document') NOT NULL,
	`mime` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`originalName` varchar(255),
	`title` varchar(255),
	`altPt` varchar(500),
	`altEn` varchar(500),
	`captionPt` text,
	`captionEn` text,
	`uploadedBy` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deletedAt` timestamp,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(200) NOT NULL,
	`subject` varchar(200),
	`message` text NOT NULL,
	`lang` varchar(4) NOT NULL DEFAULT 'pt',
	`ipHash` varchar(64),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`id` int NOT NULL,
	`draft` json NOT NULL,
	`published` json NOT NULL,
	`draftUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`publishedBy` varchar(200),
	CONSTRAINT `site_content_id` PRIMARY KEY(`id`)
);
