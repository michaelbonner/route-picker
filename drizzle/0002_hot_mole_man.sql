CREATE TABLE "route_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route" ADD COLUMN "routeGroupId" integer;--> statement-breakpoint
ALTER TABLE "route_group" ADD CONSTRAINT "route_group_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "route_group_userId_idx" ON "route_group" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "route" ADD CONSTRAINT "route_routeGroupId_route_group_id_fk" FOREIGN KEY ("routeGroupId") REFERENCES "public"."route_group"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "routeGroupId" ON "route" USING btree ("routeGroupId");