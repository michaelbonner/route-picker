import { pgTable, serial, text, integer, timestamp, json, index, unique } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof user>;
export type Route = InferSelectModel<typeof route>;
export type Trip = InferSelectModel<typeof trip>;

export const user = pgTable('User', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	provider: text('provider').notNull(),
	createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
	emailProviderUnique: unique().on(t.email, t.provider),
}));

export const userRelations = relations(user, ({ many }) => ({
	routes: many(route),
}));

export const route = pgTable('Route', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	userId: integer('userId').notNull().references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
	userIdIdx: index('userId').on(t.userId),
}));

export const routeRelations = relations(route, ({ one, many }) => ({
	user: one(user, {
		fields: [route.userId],
		references: [user.id],
	}),
	trips: many(trip),
}));

export const trip = pgTable('Trip', {
	id: serial('id').primaryKey(),
	startTime: timestamp('startTime', { mode: 'date' }).defaultNow().notNull(),
	endTime: timestamp('endTime', { mode: 'date' }),
	startLocation: json('startLocation').default({}).notNull(),
	endLocation: json('endLocation').default({}).notNull(),
	path: json('path').default({}).notNull(),
	routeId: integer('routeId').notNull().references(() => route.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
	createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tripRelations = relations(trip, ({ one }) => ({
	route: one(route, {
		fields: [trip.routeId],
		references: [route.id],
	}),
}));
