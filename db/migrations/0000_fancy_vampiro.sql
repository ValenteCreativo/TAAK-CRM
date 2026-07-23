CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`amount` real NOT NULL,
	`due_date` text,
	`paid_at` text,
	`label` text DEFAULT 'Pago' NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`stage` text DEFAULT 'Junta inicial' NOT NULL,
	`internal_status` text DEFAULT 'En diseño' NOT NULL,
	`budget` real DEFAULT 0 NOT NULL,
	`start_date` text,
	`advance_date` text,
	`delivery_date` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`endpoint` text NOT NULL,
	`subscription` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);