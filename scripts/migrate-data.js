import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chain } from 'stream-chain'
import { parser } from 'stream-json'
import { streamArray } from 'stream-json/streamers/stream-array.js'
import { initDb, insertStatement, recordFileVersion } from '../backend/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.dirname(__dirname)
const dataDir = path.join(projectRoot, 'data')

const BATCH_SIZE = 1000

async function migrateFile(client, file) {
  const filePath = path.join(dataDir, file)
  const stream = chain([
    fs.createReadStream(filePath, { encoding: 'utf8' }),
    parser(),
    streamArray()
  ])

  let batch = []
  let total = 0
  let inserted = 0

  const flush = async () => {
    if (batch.length === 0) return
    const statements = batch.map(insertStatement)
    await client.batch(statements, 'write')
    inserted += batch.length
    batch = []
  }

  await new Promise((resolve, reject) => {
    stream.on('data', async (data) => {
      const student = data.value
      total++
      batch.push(student)
      if (batch.length >= BATCH_SIZE) {
        stream.pause()
        try {
          await flush()
          if (inserted % 10000 === 0) console.log(`  ${file}: ${inserted} baris...`)
        } catch (err) {
          reject(err)
        }
        stream.resume()
      }
    })
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  await flush()
  console.log(`Selesai ${file}: ${total} dibaca, ${inserted} di-insert.`)
  await recordFileVersion(file, filePath, 1)
}

async function migrate() {
  const client = await initDb()
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('Tidak ada file .json di folder data/.')
    process.exit(0)
  }
  for (const file of files) {
    console.log(`Import ${file} ...`)
    await migrateFile(client, file)
  }
  console.log('Migration complete!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
