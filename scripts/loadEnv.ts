import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const defaultsPath = path.resolve(process.cwd(), '.env.defaults');
const examplePath = path.resolve(process.cwd(), '.env.example');

// 1. Load .env
dotenv.config({ path: envPath });

// 2. Load .env.defaults (dotenv.config doesn't override existing variables)
if (fs.existsSync(defaultsPath)) {
  dotenv.config({ path: defaultsPath });
}

// 3. Verify against .env.example (safe: true)
if (fs.existsSync(examplePath)) {
  const example = dotenv.parse(fs.readFileSync(examplePath));
  for (const key in example) {
    if (process.env[key] === undefined) {
      throw new Error(`Missing environment variable: ${key} (defined in .env.example)`);
    }
  }
}
