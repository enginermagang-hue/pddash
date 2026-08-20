import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, insertStudent, recordFileVersion, getDb } from '../backend/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.dirname(__dirname)
const dataDir = path.join(projectRoot, 'data')

async function migrate() {
  const db = await initDb()
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const students = JSON.parse(content)

    console.log(`Importing ${students.length} students from ${file}...`)

    const db = await getDb()
    await db.run('BEGIN')
    try {
      for (const student of students) {
        await insertStudent(student)
      }
      await db.run('COMMIT')
    } catch (err) {
      await db.run('ROLLBACK')
      throw err
    }

    await recordFileVersion(file, filePath, 1)
    console.log(`Migrated ${file}`)
  }

  console.log('Migration complete!')
  process.exit(0)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})