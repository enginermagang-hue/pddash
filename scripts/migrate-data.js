import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, insertStatement, recordFileVersion } from '../backend/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.dirname(__dirname)
const dataDir = path.join(projectRoot, 'data')

async function migrate() {
  const client = await initDb()
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const students = JSON.parse(content)

    console.log(`Importing ${students.length} students from ${file}...`)

    const statements = students.map(insertStatement)
    await client.batch(statements, 'write')

    await recordFileVersion(file, filePath, 1)
    console.log(`Migrated ${file}`)
  }

  console.log('Migration complete!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
