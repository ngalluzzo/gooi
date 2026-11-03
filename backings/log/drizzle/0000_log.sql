CREATE TABLE `entries` (
	`stream` text NOT NULL,
	`position` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`stream`, `position`),
	FOREIGN KEY (`stream`) REFERENCES `streams`(`stream`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `streams` (
	`stream` text PRIMARY KEY NOT NULL,
	`length` integer NOT NULL,
	`updated` text NOT NULL
);
