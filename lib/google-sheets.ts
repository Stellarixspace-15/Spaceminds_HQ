import { google } from 'googleapis'
import { PROGRAM_COLUMNS, STUDENT_COLUMNS } from '@/lib/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

type Cols = readonly string[]

async function readTab(tabName: string, cols: Cols, lastCol: string) {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: `'${tabName}'!A:${lastCol}`,
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  return rows.slice(1).map((row, idx) => {
    const obj: Record<string, string> = {}
    cols.forEach((c, i) => { obj[c] = row[i] ?? '' })
    obj._rowIndex = String(idx + 2)
    return obj
  })
}

async function updateRow(tabName: string, rowIndex: number, data: Record<string, string>, cols: Cols, lastCol: string) {
  const sheets = getSheets()
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: `'${tabName}'!A${rowIndex}:${lastCol}${rowIndex}`,
  })
  const ex = existing.data.values?.[0] ?? []
  const updated = cols.map((c, i) => {
    if (c === 'last_updated') return new Date().toISOString().slice(0, 10)
    return data[c] ?? ex[i] ?? ''
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${rowIndex}:${lastCol}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updated] },
  })
}

async function writeHeaders(tabName: string, cols: Cols, lastCol: string) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: `'${tabName}'!A1:${lastCol}1`,
    valueInputOption: 'RAW',
    requestBody: { values: [cols as string[]] },
  })
}

// ── Program tabs (A:R = 18 cols incl category) ─────────────
export const readProgramTab = (tab: string) => readTab(tab, PROGRAM_COLUMNS, 'R')
export const updateProgramRow = (tab: string, row: number, data: Record<string, string>) =>
  updateRow(tab, row, data, PROGRAM_COLUMNS, 'R')
export const ensureProgramHeaders = (tab: string) => writeHeaders(tab, PROGRAM_COLUMNS, 'R')

// ── Students tab (A:Q = 17 cols) ────────────────────────────
export const readStudentsTab = (tab: string) => readTab(tab, STUDENT_COLUMNS, 'Q')
export const updateStudentRow = (tab: string, row: number, data: Record<string, string>) =>
  updateRow(tab, row, data, STUDENT_COLUMNS, 'Q')
export const ensureStudentHeaders = (tab: string) => writeHeaders(tab, STUDENT_COLUMNS, 'Q')

// Write an auto-generated student_id into column A of a row
export async function writeStudentId(tab: string, rowIndex: number, studentId: string) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: `'${tab}'!A${rowIndex}`,
    valueInputOption: 'RAW', requestBody: { values: [[studentId]] },
  })
}

// ── Tab management ───────────────────────────────────────────
export async function getSheetTabs(): Promise<string[]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  return (res.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean)
}

export async function createTab(title: string): Promise<void> {
  const sheets = getSheets()
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
}
