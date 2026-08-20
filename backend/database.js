import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let client = null
let initPromise = null

const DETAIL_FIELDS = {
  'Detail > Agama': 'detail_agama',
  'Detail > Akte Kelahiran': 'detail_akte_kelahiran',
  'Detail > Alamat': 'detail_alamat',
  'Detail > Alat Transportasi': 'detail_alat_transportasi',
  'Detail > Anak Ke': 'detail_anak_ke',
  'Detail > Ayah > Kebutuhan Khusus': 'detail_ayah_kebutuhan_khusus',
  'Detail > Ayah > NIK': 'detail_ayah_nik',
  'Detail > Ayah > Nama Lengkap': 'detail_ayah_nama_lengkap',
  'Detail > Ayah > Pekerjaan': 'detail_ayah_pekerjaan',
  'Detail > Ayah > Pendidikan': 'detail_ayah_pendidikan',
  'Detail > Ayah > Penghasilan': 'detail_ayah_penghasilan',
  'Detail > Ayah > Tahun Lahir': 'detail_ayah_tahun_lahir',
  'Detail > Desa/Kelurahan': 'detail_desa_kelurahan',
  'Detail > Dusun': 'detail_dusun',
  'Detail > Email': 'detail_email',
  'Detail > Ibu Kandung > Kebutuhan Khusus': 'detail_ibu_kebutuhan_khusus',
  'Detail > Ibu Kandung > NIK': 'detail_ibu_nik',
  'Detail > Ibu Kandung > Nama Lengkap': 'detail_ibu_nama_lengkap',
  'Detail > Ibu Kandung > Pekerjaan': 'detail_ibu_pekerjaan',
  'Detail > Ibu Kandung > Pendidikan': 'detail_ibu_pendidikan',
  'Detail > Ibu Kandung > Penghasilan': 'detail_ibu_penghasilan',
  'Detail > Ibu Kandung > Tahun Lahir': 'detail_ibu_tahun_lahir',
  'Detail > Jenis Tinggal': 'detail_jenis_tinggal',
  'Detail > Kebutuhan Khusus': 'detail_kebutuhan_khusus',
  'Detail > Kewarganegaraan': 'detail_kewarganegaraan',
  'Detail > Kode Pos': 'detail_kode_pos',
  'Detail > Nama Bank': 'detail_nama_bank',
  'Detail > Nama KCP/Unit': 'detail_nama_kcp_unit',
  'Detail > Nama KIP': 'detail_nama_kip',
  'Detail > Nama Rekening': 'detail_nama_rekening',
  'Detail > Nomor HP': 'detail_nomor_hp',
  'Detail > Nomor KIP': 'detail_nomor_kip',
  'Detail > Nomor KKS': 'detail_nomor_kks',
  'Detail > Nomor KPS': 'detail_nomor_kps',
  'Detail > Nomor Rekening': 'detail_nomor_rekening',
  'Detail > Nomor Telepon': 'detail_nomor_telepon',
  'Detail > Propinsi': 'detail_propinsi',
  'Detail > RT / RW': 'detail_rt_rw',
  'Detail > Tempat Lahir': 'detail_tempat_lahir'
}
const DETAIL_JSON_TO_COL = Object.fromEntries(
  Object.entries(DETAIL_FIELDS).map(([jsonKey, col]) => [col, jsonKey])
)
const DETAIL_COLUMNS = Object.values(DETAIL_FIELDS)

function decodeEntities(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

async function getClient() {
  if (!client) {
    const url = process.env.TURSO_URL || pathToFileURL(path.join(__dirname, 'db.sqlite')).href
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  }
  return client
}

async function ensureDetailColumns(database) {
  const r = await database.execute("PRAGMA table_info(students)")
  const existing = new Set(r.rows.map((row) => row.name))
  for (const col of DETAIL_COLUMNS) {
    if (!existing.has(col)) {
      await database.execute({ sql: `ALTER TABLE students ADD COLUMN "${col}" TEXT`, args: [] })
    }
  }
}

async function initDb() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const database = await getClient()
    await database.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        nama TEXT NOT NULL,
        nisn TEXT,
        jenis_kelamin TEXT,
        tanggal_lahir TEXT,
        nama_ibu_kandung TEXT,
        nik TEXT,
        rombel TEXT,
        tingkat TEXT,
        last_update TEXT,
        sekolah_id TEXT,
        npsn TEXT,
        nama_sekolah TEXT,
        bentuk TEXT,
        kecamatan TEXT,
        kabupaten TEXT,
        rombongan_belajar_id TEXT
      )
    `)
    await database.execute(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        version INTEGER NOT NULL,
        imported_at TEXT NOT NULL
      )
    `)
    await ensureDetailColumns(database)
    return database
  })()
  return initPromise
}

function insertStatement(student) {
  const detailValues = DETAIL_COLUMNS.map((col) => {
    const jsonKey = DETAIL_JSON_TO_COL[col]
    const raw = student[jsonKey]
    return raw === undefined || raw === null ? '' : decodeEntities(String(raw))
  })

  const columns = [
    'id', 'nama', 'nisn', 'jenis_kelamin', 'tanggal_lahir', 'nama_ibu_kandung', 'nik',
    'rombel', 'tingkat', 'last_update', 'sekolah_id', 'npsn', 'nama_sekolah', 'bentuk',
    'kecamatan', 'kabupaten', 'rombongan_belajar_id',
    ...DETAIL_COLUMNS
  ]
  const placeholders = columns.map(() => '?').join(', ')

  return {
    sql: `INSERT OR REPLACE INTO students (${columns.join(', ')}) VALUES (${placeholders})`,
    args: [
      student.peserta_didik_id,
      student.nama,
      student.nisn,
      student.jenis_kelamin,
      student.tanggal_lahir,
      student.nama_ibu_kandung,
      student.nik,
      student.rombel,
      student.tingkat,
      student.last_update,
      student.sekolah_id,
      student.npsn,
      student.nama_sekolah,
      student.bentuk,
      student.kecamatan,
      student.kabupaten,
      student.rombongan_belajar_id,
      ...detailValues
    ]
  }
}

async function insertStudent(student) {
  const database = await getClient()
  await database.execute(insertStatement(student))
}

async function getAllStudents() {
  const database = await getClient()
  const r = await database.execute('SELECT * FROM students ORDER BY nama')
  return r.rows
}

async function getStudentsByRomBel(rombel) {
  const database = await getClient()
  const r = await database.execute({
    sql: 'SELECT * FROM students WHERE rombel = ? ORDER BY nama',
    args: [rombel]
  })
  return r.rows
}

function buildWhere({ rombel, kabupaten, kecamatan, tingkat, nama_sekolah, q } = {}) {
  const conditions = []
  const params = []
  if (rombel) {
    conditions.push('rombel = ?')
    params.push(rombel)
  }
  if (kabupaten) {
    conditions.push('kabupaten = ?')
    params.push(kabupaten)
  }
  if (kecamatan) {
    conditions.push('kecamatan = ?')
    params.push(kecamatan)
  }
  if (tingkat) {
    conditions.push('tingkat = ?')
    params.push(tingkat)
  }
  if (nama_sekolah) {
    conditions.push('nama_sekolah = ?')
    params.push(nama_sekolah)
  }
  if (q) {
    const safe = q.replace(/[\\%_]/g, (c) => '\\' + c)
    const like = `%${safe}%`
    conditions.push('(nama LIKE ? ESCAPE \'\\\' OR nisn LIKE ? ESCAPE \'\\\' OR nik LIKE ? ESCAPE \'\\\')')
    params.push(like, like, like)
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  return { where, params }
}

const SORTABLE_COLUMNS = ['nama', 'nisn', 'jenis_kelamin', 'tanggal_lahir', 'rombel', 'tingkat', 'nama_sekolah']

function resolveSort(sortBy, sortDir) {
  const safeBy = SORTABLE_COLUMNS.includes(sortBy) ? sortBy : 'nama'
  const dir = String(sortDir || '').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
  return { column: safeBy, dir }
}

async function getStudentsPaginated({ rombel, kabupaten, kecamatan, tingkat, nama_sekolah, q, page = 1, pageSize = 20, sortBy, sortDir } = {}) {
  const database = await getClient()
  const offset = (page - 1) * pageSize
  const { where, params } = buildWhere({ rombel, kabupaten, kecamatan, tingkat, nama_sekolah, q })
  const { column, dir } = resolveSort(sortBy, sortDir)
  const dataR = await database.execute({
    sql: `SELECT * FROM students ${where} ORDER BY ${column} ${dir}, nama ASC LIMIT ? OFFSET ?`,
    args: [...params, pageSize, offset]
  })
  const countR = await database.execute({
    sql: `SELECT COUNT(*) AS total FROM students ${where}`,
    args: params
  })
  const countRow = countR.rows[0]
  return { data: dataR.rows, total: countRow ? countRow.total : 0 }
}

async function getStudentsExport({ sortBy, sortDir, ...filters } = {}) {
  const database = await getClient()
  const { where, params } = buildWhere(filters)
  const { column, dir } = resolveSort(sortBy, sortDir)
  const r = await database.execute({
    sql: `SELECT * FROM students ${where} ORDER BY ${column} ${dir}, nama ASC`,
    args: params
  })
  return r.rows
}

async function getRombelList() {
  const database = await getClient()
  const r = await database.execute(
    `SELECT DISTINCT rombel FROM students WHERE rombel IS NOT NULL AND rombel != '' ORDER BY rombel`
  )
  return r.rows.map((row) => row.rombel)
}

const DISTINCT_FIELD_WHITELIST = ['kabupaten', 'kecamatan', 'tingkat', 'rombel', 'nama_sekolah']

async function getDistinctValues(field, { kabupaten, kecamatan } = {}) {
  if (!DISTINCT_FIELD_WHITELIST.includes(field)) {
    throw new Error(`Invalid field: ${field}`)
  }
  const database = await getClient()
  const conditions = []
  const params = []
  conditions.push(`${field} IS NOT NULL AND ${field} != ''`)
  if (kabupaten) {
    conditions.push('kabupaten = ?')
    params.push(kabupaten)
  }
  if (kecamatan) {
    conditions.push('kecamatan = ?')
    params.push(kecamatan)
  }
  const where = 'WHERE ' + conditions.join(' AND ')
  const orderBy = field === 'tingkat'
    ? `ORDER BY CAST(REPLACE(${field}, 'Kelas ', '') AS INTEGER)`
    : `ORDER BY ${field}`
  const r = await database.execute({
    sql: `SELECT DISTINCT ${field} FROM students ${where} ${orderBy}`,
    args: params
  })
  return r.rows.map((row) => row[field])
}

async function recordFileVersion(filename, filePath, version) {
  const database = await getClient()
  await database.execute({
    sql: `INSERT INTO file_versions (filename, file_path, version, imported_at) VALUES (?, ?, ?, datetime('now'))`,
    args: [filename, filePath, version]
  })
}

export {
  getClient,
  initDb,
  insertStatement,
  insertStudent,
  getAllStudents,
  getStudentsByRomBel,
  getStudentsPaginated,
  getStudentsExport,
  getRombelList,
  getDistinctValues,
  recordFileVersion
}
