import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { initDb } from '../backend/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function copyTable(local, remote, table) {
  const from = await local.execute(`SELECT * FROM ${table}`)
  const rows = from.rows
  if (rows.length === 0) {
    console.log(`Tabel ${table}: kosong, lewati.`)
    return 0
  }
  const cols = Object.keys(rows[0])
  const placeholders = cols.map(() => '?').join(', ')
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
  const statements = rows.map((row) =>
    ({ sql, args: cols.map((c) => (row[c] === undefined ? null : row[c])) })
  )
  await remote.batch(statements, 'write')
  return rows.length
}

async function main() {
  const tursoUrl = process.env.TURSO_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (!tursoUrl || !tursoToken) {
    console.error('ERROR: TURSO_URL dan TURSO_AUTH_TOKEN harus di-set di environment.')
    process.exit(1)
  }

  const localPath = pathToFileURL(path.join(__dirname, '../backend/db.sqlite')).href
  console.log(`Membaca database lokal: ${localPath}`)
  const local = createClient({ url: localPath })

  console.log(`Menghubungkan ke Turso: ${tursoUrl}`)
  const remote = await initDb()
  console.log('Schema Turso siap.')

  for (const table of ['students', 'file_versions']) {
    const count = await copyTable(local, remote, table)
    console.log(`Tabel ${table}: ${count} baris disalin.`)
  }

  console.log('Migrasi selesai.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migrasi gagal:', err)
  process.exit(1)
})
