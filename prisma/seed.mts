import { PrismaClient } from '@prisma/client';
import { subDays, subMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
	const existingRoutes = await prisma.route.findMany();
	if (existingRoutes.length > 0) {
		console.info(`Seeding already done. Exiting.`);
		return;
	}

	console.info(`Start seeding ...`);

	const userId = Number(Math.random().toString(36).substring(2, 9));
	await prisma.user.create({
		data: {
			id: userId,
			email: `which-route${new Date().getTime()}@michaelbonner.dev`,
			provider: 'google',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	});

	await prisma.route.createMany({
		data: [
			{ name: 'Work - left way', userId },
			{ name: 'Work - right way', userId }
		]
	});
	console.info(`Created routes.`);

	const dbRoutes = await prisma.route.findMany();
	for await (const route of dbRoutes) {
		await prisma.trip.createMany({
			data: [
				{
					routeId: route.id,
					startTime: subMinutes(new Date(), 5),
					endTime: new Date()
				},
				{
					routeId: route.id,
					startTime: subDays(subMinutes(new Date(), 4), 1),
					endTime: subDays(new Date(), 1)
				}
			]
		});
	}

	console.info(`Created trips.`);

	console.info(`Seeding finished.`);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
