import { google } from 'googleapis'
import { SHEET_COLUMNS } from '@/lib/types'

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

export async function readSheetTab(tabName: string) {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A:Q`,
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []

  return rows.slice(1).map((row, idx) => {
    const obj: Record<string, string> = {}
    SHEET_COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? '' })
    return { ...obj, _rowIndex: idx + 2 }
  }).filter(r => r.school_id)
}

export async function updateSheetRow(tabName: string, rowIndex: number, data: Record<string, string>) {
  const sheets = getSheets()
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${rowIndex}:Q${rowIndex}`,
  })
  const existingRow = existing.data.values?.[0] ?? []
  const updatedRow = SHEET_COLUMNS.map((col, i) => {
    if (col === 'last_updated') return new Date().toISOString()
    return data[col] ?? existingRow[i] ?? ''
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${rowIndex}:Q${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [updatedRow] },
  })
}

export async function ensureHeaders(tabName: string) {
  const sheets = getSheets()
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A1:Q1`,
  })
  if (existing.data.values?.[0]?.[0] === 'school_id') return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A1:Q1`,
    valueInputOption: 'RAW',
    requestBody: { values: [SHEET_COLUMNS as unknown as string[]] },
  })
}
