import path from 'node:path';
import fs from 'node:fs/promises';
import { extractionSchema } from '../src/schemas/extraction.schema';
import { formatExtractionError } from '../src/schemas/extraction.validation';

const readJson = async (filePath: string) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const main = async () => {
  const args = process.argv.slice(2);
  const inputArg = args.find((a) => a.startsWith('--input='));
  if (!inputArg) throw new Error('Bitte --input=<pfad/zur/extraction.json> angeben');
  const inputPath = path.resolve(inputArg.split('=')[1]);

  try {
    const json = await readJson(inputPath);
    extractionSchema.parse(json);
    console.log('OK');
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in (error as any)) {
      console.error('❌ Extraction ungültig:\n' + formatExtractionError(error as any));
    } else {
      console.error('❌ Fehler beim Lesen/Validieren:', (error as Error).message);
    }
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
