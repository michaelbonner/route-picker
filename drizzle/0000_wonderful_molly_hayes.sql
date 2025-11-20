CREATE TABLE "Route" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Trip" (
	"id" serial PRIMARY KEY NOT NULL,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp,
	"startLocation" json DEFAULT '{}'::json NOT NULL,
	"endLocation" json DEFAULT '{}'::json NOT NULL,
	"path" json DEFAULT '{}'::json NOT NULL,
	"routeId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"provider" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email"),
	CONSTRAINT "User_email_provider_unique" UNIQUE("email","provider")
);
--> statement-breakpoint
ALTER TABLE "Route" ADD CONSTRAINT "Route_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_Route_id_fk" FOREIGN KEY ("routeId") REFERENCES "public"."Route"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "userId" ON "Route" USING btree ("userId");