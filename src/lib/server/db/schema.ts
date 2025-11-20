import { pgTable, serial, text, integer, timestamp, json, index, unique, boolean } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof user>;
export type Route = InferSelectModel<typeof route>;
export type Trip = InferSelectModel<typeof trip>;

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull(),
	image: text('image'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => user.id)
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt').notNull(),
	updatedAt: timestamp('updatedAt').notNull()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	createdAt: timestamp('createdAt'),
	updatedAt: timestamp('updatedAt')
});

export const userRelations = relations(user, ({ many }) => ({
	routes: many(route),
}));

export const route = pgTable('route', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
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

export const trip = pgTable('trip', {
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
