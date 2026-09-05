// Loads worker/.env regardless of the directory the process was started from.
// Imported first by index.js so db.js can read the credentials at module load.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))

config({ path: path.join(here, '.env') })
