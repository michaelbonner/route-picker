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

	await prisma.route.createMany({
		data: [{ name: 'Work - left way' }, { name: 'Work - right way' }]
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
