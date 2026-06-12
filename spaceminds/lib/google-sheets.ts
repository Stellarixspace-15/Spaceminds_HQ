import { google } from 'googleapis'
import { SHEET_COLUMNS, SheetRow } from '@/lib/types'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!
const HEADER_ROW = 1 // Row 1 is always the header

function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

function getSheetsClient() {
  const auth = getAuthClient()
  return google.sheets({ version: 'v4', auth })
}

// Read all rows from a specific tab
export async function readSheetTab(tabName: string): Promise<SheetRow[]> {
  const sheets = getSheetsClient()
  const range = `'${tabName}'!A:Q`

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  })

  const rows = response.data.values || []
  if (rows.length <= 1) return [] // Only header or empty

  // rows[0] is the header row, skip it
  return rows.slice(1).map((row, index) => {
    const obj: Record<string, string> = {}
    SHEET_COLUMNS.forEach((col, i) => {
      obj[col] = row[i] ?? ''
    })
    return { ...obj, _rowIndex: index + 2 } as SheetRow & { _rowIndex: number }
  }).filter(r => r.school_id) // Skip empty rows
}

// Write a single row back to Google Sheets (update)
export async function updateSheetRow(
  tabName: string,
  rowIndex: number,
  data: Partial<SheetRow>
): Promise<void> {
  const sheets = getSheetsClient()

  // First read the row to preserve existing values
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${rowIndex}:Q${rowIndex}`,
  })

  const existingRow = existing.data.values?.[0] ?? []
  const updatedRow = SHEET_COLUMNS.map((col, i) => {
    if (col === 'last_updated') return new Date().toISOString()
    return (data as Record<string, string>)[col] ?? existingRow[i] ?? ''
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${rowIndex}:Q${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  })
}

// Append a new row to a tab
export async function appendSheetRow(
  tabName: string,
  data: SheetRow
): Promise<number> {
  const sheets = getSheetsClient()

  const row = SHEET_COLUMNS.map(col => {
    if (col === 'last_updated') return new Date().toISOString()
    return (data as Record<string, string>)[col] ?? ''
  })

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A:Q`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  })

  // Extract row number from updatedRange like 'Workshops'!A15:Q15
  const updatedRange = response.data.updates?.updatedRange || ''
  const match = updatedRange.match(/!A(\d+)/)
  return match ? parseInt(match[1]) : -1
}

// Ensure header row exists in a tab
export async function ensureHeaderRow(tabName: string): Promise<void> {
  const sheets = getSheetsClient()

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A1:Q1`,
  })

  const firstRow = existing.data.values?.[0] ?? []
  if (firstRow[0] === 'school_id') return // Header already exists

  const headers = [
    'school_id', 'school_name', 'contact_name', 'contact_email', 'contact_phone',
    'city', 'program_type', 'enrollment_count', 'pipeline_step', 'pipeline_status',
    'assigned_trainer', 'outreach_date', 'workshop_date', 'curriculum_start',
    'notes', 'last_updated', 'status'
  ]

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A1:Q1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  })
}

// Get all tab names in the sheet
export async function getSheetTabs(): Promise<string[]> {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  return (response.data.sheets || []).map(s => s.properties?.title || '').filter(Boolean)
}
