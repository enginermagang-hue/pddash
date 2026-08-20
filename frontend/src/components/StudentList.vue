<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import TomSelect from 'tom-select'
import { apiFetch } from '../api.ts'

interface Student {
  id: string
  nama: string
  nisn: string
  jenis_kelamin: string
  tanggal_lahir: string
  nama_ibu_kandung: string
  nik: string
  rombel: string
  tingkat: string
  last_update: string
  sekolah_id: string
  npsn: string
  nama_sekolah: string
  bentuk: string
  kecamatan: string
  kabupaten: string
  rombongan_belajar_id: string
}

interface ColumnDef {
  key: string
  label: string
  visible: boolean
}

const students = ref<Student[]>([])
const loading = ref(true)
const error = ref('')

const selectedKabupaten = ref('')
const selectedKecamatan = ref('')
const selectedKelas = ref('')
const selectedSekolah = ref('')
const selectedRombel = ref('')
const search = ref('')

const kabupatenOptions = ref<string[]>([])
const kecamatanOptions = ref<string[]>([])
const kelasOptions = ref<string[]>([])
const sekolahOptions = ref<string[]>([])
const rombelOptions = ref<string[]>([])

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showColumns = ref(false)
const showFilters = ref(false)

const columns = ref<ColumnDef[]>([
  { key: 'index', label: '#', visible: true },
  { key: 'nama', label: 'Nama', visible: true },
  { key: 'nisn', label: 'NISN', visible: true },
  { key: 'jenis_kelamin', label: 'JK', visible: true },
  { key: 'tanggal_lahir', label: 'Lahir', visible: true },
  { key: 'rombel', label: 'Rombel', visible: true },
  { key: 'tingkat', label: 'Tingkat', visible: true },
  { key: 'nama_sekolah', label: 'Sekolah', visible: true }
])

const visibleColumns = computed(() => columns.value.filter((c) => c.visible))

const EXPORT_COLUMNS: { key: keyof Student; label: string }[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'nisn', label: 'NISN' },
  { key: 'jenis_kelamin', label: 'JK' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { key: 'nama_ibu_kandung', label: 'Nama Ibu Kandung' },
  { key: 'nik', label: 'NIK' },
  { key: 'rombel', label: 'Rombel' },
  { key: 'tingkat', label: 'Tingkat' },
  { key: 'nama_sekolah', label: 'Sekolah' },
  { key: 'npsn', label: 'NPSN' },
  { key: 'bentuk', label: 'Bentuk' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten', label: 'Kabupaten' },
  { key: 'rombongan_belajar_id', label: 'ID Rombel' },
  { key: 'last_update', label: 'Last Update' }
]

const exporting = ref(false)
const showExport = ref(false)
const exportSelected = ref<string[]>(EXPORT_COLUMNS.map((c) => c.key))

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

async function exportCsv() {
  if (exportSelected.value.length === 0) return
  exporting.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    if (selectedKabupaten.value) params.set('kabupaten', selectedKabupaten.value)
    if (selectedKecamatan.value) params.set('kecamatan', selectedKecamatan.value)
    if (selectedKelas.value) params.set('tingkat', selectedKelas.value)
    if (selectedSekolah.value) params.set('nama_sekolah', selectedSekolah.value)
    if (selectedRombel.value) params.set('rombel', selectedRombel.value)
    if (search.value.trim()) params.set('q', search.value.trim())

    const rows = (await apiFetch(`/api/students/export?${params.toString()}`)) as Student[]

    const selected = EXPORT_COLUMNS.filter((c) => exportSelected.value.includes(c.key))
    const header = selected.map((c) => csvEscape(c.label)).join(',')
    const lines = rows.map((row) =>
      selected.map((c) => csvEscape((row as unknown as Record<string, unknown>)[c.key])).join(',')
    )
    const csv = [header, ...lines].join('\r\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `peserta_didik_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    exporting.value = false
    showExport.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, total.value))

let suppressChange = false

let tsKabupaten: TomSelect | null = null
let tsKecamatan: TomSelect | null = null
let tsKelas: TomSelect | null = null
let tsSekolah: TomSelect | null = null
let tsRombel: TomSelect | null = null

const kabupatenSelectRef = ref<HTMLSelectElement | null>(null)
const kecamatanSelectRef = ref<HTMLSelectElement | null>(null)
const kelasSelectRef = ref<HTMLSelectElement | null>(null)
const sekolahSelectRef = ref<HTMLSelectElement | null>(null)
const rombelSelectRef = ref<HTMLSelectElement | null>(null)

async function fetchOptions(field: string, extra: Record<string, string> = {}): Promise<string[]> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(extra)) {
    if (v) params.set(k, v)
  }
  const query = params.toString()
  return (await apiFetch(`/api/options?field=${encodeURIComponent(field)}${query ? '&' + query : ''}`)) as string[]
}

async function fetchStudents() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize.value)
    })
    if (selectedKabupaten.value) params.set('kabupaten', selectedKabupaten.value)
    if (selectedKecamatan.value) params.set('kecamatan', selectedKecamatan.value)
    if (selectedKelas.value) params.set('tingkat', selectedKelas.value)
    if (selectedSekolah.value) params.set('nama_sekolah', selectedSekolah.value)
    if (selectedRombel.value) params.set('rombel', selectedRombel.value)
    if (search.value.trim()) params.set('q', search.value.trim())

    const result = await apiFetch(`/api/students?${params.toString()}`)
    students.value = result.data || []
    total.value = result.total || 0
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

function resetAndFetch() {
  page.value = 1
  fetchStudents()
}

function resetFilters() {
  selectedKabupaten.value = ''
  selectedKecamatan.value = ''
  selectedSekolah.value = ''
  selectedKelas.value = ''
  selectedRombel.value = ''
  search.value = ''
  page.value = 1
  syncTs(tsKabupaten, kabupatenOptions.value, '')
  syncTs(tsKecamatan, kecamatanOptions.value, '')
  syncTs(tsKelas, kelasOptions.value, '')
  syncTs(tsSekolah, sekolahOptions.value, '')
  syncTs(tsRombel, rombelOptions.value, '')
  fetchStudents()
}

async function updateKecamatanOptions() {
  try {
    kecamatanOptions.value = await fetchOptions('kecamatan', { kabupaten: selectedKabupaten.value })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }
}

async function updateSekolahOptions() {
  try {
    sekolahOptions.value = await fetchOptions('nama_sekolah', {
      kabupaten: selectedKabupaten.value,
      kecamatan: selectedKecamatan.value
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }
}

function onKabupatenSelect() {
  selectedKecamatan.value = ''
  selectedSekolah.value = ''
  updateKecamatanOptions()
  updateSekolahOptions()
  resetAndFetch()
}

function onKecamatanSelect() {
  selectedSekolah.value = ''
  updateSekolahOptions()
  resetAndFetch()
}

function onSimpleFilterSelect() {
  resetAndFetch()
}

function onSearchInput() {
  page.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchStudents()
  }, 300)
}

function changePageSize() {
  page.value = 1
  fetchStudents()
}

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  fetchStudents()
}

function makeTs(el: HTMLSelectElement | null, setVal: (v: string) => void, onSelect: () => void): TomSelect | null {
  if (!el) return null
  return new TomSelect(el, {
    allowEmptyOption: true,
    maxItems: 1,
    placeholder: 'Semua',
    onChange: (value: string) => {
      if (suppressChange) return
      setVal(value)
      onSelect()
    }
  })
}

function syncTs(ts: TomSelect | null, options: string[], currentValue: string) {
  if (!ts) return
  suppressChange = true
  ts.clearOptions()
  ts.addOption([{ value: '', text: 'Semua' }, ...options.map((o) => ({ value: o, text: o }))])
  ts.refreshOptions(false)
  ts.setValue(currentValue || '')
  suppressChange = false
}

watch(kabupatenOptions, (opts) => syncTs(tsKabupaten, opts, selectedKabupaten.value))
watch(kecamatanOptions, (opts) => syncTs(tsKecamatan, opts, selectedKecamatan.value))
watch(kelasOptions, (opts) => syncTs(tsKelas, opts, selectedKelas.value))
watch(sekolahOptions, (opts) => syncTs(tsSekolah, opts, selectedSekolah.value))
watch(rombelOptions, (opts) => syncTs(tsRombel, opts, selectedRombel.value))

onMounted(async () => {
  try {
    const [kab, kelas, rombel] = await Promise.all([
      fetchOptions('kabupaten'),
      fetchOptions('tingkat'),
      fetchOptions('rombel')
    ])
    kabupatenOptions.value = kab
    kelasOptions.value = kelas
    rombelOptions.value = rombel
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }

  tsKabupaten = makeTs(kabupatenSelectRef.value, (v) => (selectedKabupaten.value = v), onKabupatenSelect)
  tsKecamatan = makeTs(kecamatanSelectRef.value, (v) => (selectedKecamatan.value = v), onKecamatanSelect)
  tsKelas = makeTs(kelasSelectRef.value, (v) => (selectedKelas.value = v), onSimpleFilterSelect)
  tsSekolah = makeTs(sekolahSelectRef.value, (v) => (selectedSekolah.value = v), onSimpleFilterSelect)
  tsRombel = makeTs(rombelSelectRef.value, (v) => (selectedRombel.value = v), onSimpleFilterSelect)

  syncTs(tsKabupaten, kabupatenOptions.value, selectedKabupaten.value)
  syncTs(tsKecamatan, kecamatanOptions.value, selectedKecamatan.value)
  syncTs(tsKelas, kelasOptions.value, selectedKelas.value)
  syncTs(tsSekolah, sekolahOptions.value, selectedSekolah.value)
  syncTs(tsRombel, rombelOptions.value, selectedRombel.value)

  fetchStudents()
})

onUnmounted(() => {
  ;[tsKabupaten, tsKecamatan, tsKelas, tsSekolah, tsRombel].forEach((ts) => ts?.destroy())
})
</script>

<template>
  <section class="flex items-start gap-6 p-8 max-md:flex-col max-md:p-4">
    <aside class="sticky top-20 flex w-64 shrink-0 flex-col gap-3 max-md:static max-md:top-auto max-md:w-full">
      <button
        class="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40 md:hidden"
        @click="showFilters = !showFilters"
        :aria-expanded="showFilters"
      >
        <i class="bi bi-funnel"></i> {{ showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter' }}
      </button>

      <div class="flex flex-col gap-3 md:flex" :class="showFilters ? 'flex' : 'hidden'">
        <div class="flex w-full flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">Kabupaten</label>
          <select ref="kabupatenSelectRef"></select>
        </div>
        <div class="flex w-full flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">Kecamatan</label>
          <select ref="kecamatanSelectRef"></select>
        </div>
        <div class="flex w-full flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas</label>
          <select ref="kelasSelectRef"></select>
        </div>
        <div class="flex w-full flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">Sekolah</label>
          <select ref="sekolahSelectRef"></select>
        </div>
        <div class="flex w-full flex-col gap-1">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">Rombel</label>
          <select ref="rombelSelectRef"></select>
        </div>
        <button
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40"
          @click="resetFilters"
        >
          <i class="bi bi-arrow-counterclockwise"></i> Reset Filter
        </button>
        <div class="relative">
          <button
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            @click="showColumns = !showColumns"
          >
            <i class="bi bi-columns"></i> Kolom
          </button>
          <div
            v-if="showColumns"
            class="absolute right-0 top-full z-10 mt-1 flex w-48 flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <label
              v-for="col in columns"
              :key="col.key"
              class="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-slate-700 dark:text-slate-100"
            >
              <input type="checkbox" v-model="col.visible" /> {{ col.label }}
            </label>
          </div>
        </div>
      </div>

      <button
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
        @click="fetchStudents()"
        :disabled="loading"
      >
        <i class="bi bi-arrow-clockwise"></i> {{ loading ? 'Memuat...' : 'Refresh' }}
      </button>
      <button
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40"
        @click="showExport = true"
        :disabled="exporting"
      >
        <i class="bi bi-download"></i> {{ exporting ? 'Mengekspor...' : 'Export Excel' }}
      </button>
    </aside>

    <div
      v-if="showExport"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showExport = false"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-100">Export Excel (CSV)</h3>
          <button
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            @click="showExport = false"
            aria-label="Tutup"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-4 py-3">
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="col in EXPORT_COLUMNS"
              :key="col.key"
              class="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-100"
            >
              <input type="checkbox" :value="col.key" v-model="exportSelected" /> {{ col.label }}
            </label>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40"
            @click="exportSelected = EXPORT_COLUMNS.map((c) => c.key)"
          >
            Pilih Semua
          </button>
          <button
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40"
            @click="exportSelected = []"
          >
            Batal Pilih
          </button>
          <div class="ml-auto flex gap-2">
            <button
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/40"
              @click="showExport = false"
            >
              Batal
            </button>
            <button
              class="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600"
              @click="exportCsv"
              :disabled="exportSelected.length === 0 || exporting"
            >
              <i class="bi bi-file-earmark-spreadsheet"></i> Export
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="min-w-0 flex-1">
      <div class="relative mb-4 w-full">
        <i class="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          class="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          type="text"
          v-model="search"
          @input="onSearchInput"
          placeholder="Cari nama / NISN / NIK..."
        />
      </div>

      <div v-if="loading" class="p-8 text-center text-slate-500 dark:text-slate-400">Memuat data...</div>
      <div v-else-if="error" class="p-8 text-center text-red-600">{{ error }}</div>

      <div v-if="students.length">
        <div class="hidden min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:block">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr>
                <th
                  v-for="col in visibleColumns"
                  :key="col.key"
                  class="sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-700/60 dark:text-slate-200"
                >
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(student, index) in students"
                :key="student.id"
                class="hover:bg-slate-50 dark:hover:bg-slate-700/40"
              >
                <td
                  v-for="col in visibleColumns"
                  :key="col.key"
                  class="border-b border-slate-100 px-4 py-3 text-left text-sm font-medium leading-snug text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  <template v-if="col.key === 'index'">{{ rangeStart + index }}</template>
                  <template v-else-if="col.key === 'nama'">{{ student.nama }}</template>
                  <template v-else-if="col.key === 'nisn'">{{ student.nisn }}</template>
                  <template v-else-if="col.key === 'jenis_kelamin'">{{ student.jenis_kelamin }}</template>
                  <template v-else-if="col.key === 'tanggal_lahir'">{{ student.tanggal_lahir }}</template>
                  <template v-else-if="col.key === 'rombel'">{{ student.rombel }}</template>
                  <template v-else-if="col.key === 'tingkat'">{{ student.tingkat }}</template>
                  <template v-else-if="col.key === 'nama_sekolah'">{{ student.nama_sekolah }}</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="space-y-3 md:hidden">
          <div
            v-for="(student, index) in students"
            :key="student.id"
            class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="font-semibold text-slate-800 dark:text-slate-100">{{ student.nama }}</span>
              <span class="shrink-0 text-xs text-slate-400">{{ rangeStart + index }}</span>
            </div>
            <dl class="mt-3 space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">NISN</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.nisn }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">JK</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.jenis_kelamin }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Lahir</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.tanggal_lahir }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Rombel</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.rombel }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Tingkat</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.tingkat }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Sekolah</dt>
                <dd class="text-right text-slate-700 dark:text-slate-200">{{ student.nama_sekolah }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <div class="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              class="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-indigo-600 disabled:text-slate-300 dark:border-slate-600 dark:text-indigo-400 dark:disabled:text-slate-600"
              @click="goToPage(page - 1)"
              :disabled="page <= 1"
            >
              Sebelumnya
            </button>
            <span class="whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200">Halaman {{ page }} dari {{ totalPages }}</span>
            <button
              class="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-indigo-600 disabled:text-slate-300 dark:border-slate-600 dark:text-indigo-400 dark:disabled:text-slate-600"
              @click="goToPage(page + 1)"
              :disabled="page >= totalPages"
            >
              Berikutnya
            </button>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700 sm:justify-end">
            <span>Menampilkan {{ rangeStart }}–{{ rangeEnd }} dari {{ total }}</span>
            <label class="flex items-center gap-1">
              Baris:
              <select
                v-model.number="pageSize"
                @change="changePageSize"
                class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div v-else class="p-8 text-center text-slate-500 dark:text-slate-400">Tidak ada data peserta didik</div>
    </div>
  </section>
</template>
