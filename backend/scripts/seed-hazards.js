import dotenv from 'dotenv';
import { connectDB } from '../src/config/db.js';
import { hazardService } from '../src/services/hazardService.js';
import { roadNetworkService } from '../src/services/roadNetworkService.js';
import { SEED_HAZARDS } from '../src/data/seedHazards.js';

dotenv.config();

export { SEED_HAZARDS };

export async function seed(clearExisting = true) {
  console.log('Seeding 8 realistic road hazards with photos and landmarks for Indore...');
  await connectDB();
  await roadNetworkService.initialize();

  if (clearExisting) {
    await hazardService.clearAllHazards();
  }

  for (const h of SEED_HAZARDS) {
    const res = await hazardService.reportHazard(h);
    console.log(`Seeded hazard [${h.type.toUpperCase()}] at [${h.roadName} - ${h.landmark}]: ${h.description.slice(0, 50)}...`);
  }

  console.log('Seeding completed successfully with 8 realistic hazards!');
}

// Only execute when run directly via CLI
if (process.argv[1] && process.argv[1].endsWith('seed-hazards.js')) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
