/**
 * Google Sheets two-way sync utility
 * Uses the public gviz CSV API for reads (no API key needed, sheet must be shared)
 * Uses Google Sheets API v4 for writes (requires user to set up service account or provide API key)
 */

/**
 * Build the gviz CSV URL for a Google Sheet tab
 * The sheet must be shared as "Anyone with the link can view"
 */
export function buildGvizUrl(sheetUrl, gid = '0') {
  // Extract the sheet ID from the URL
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) return null
  const sheetId = match[1]
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
}

/**
 * Fetch and parse a Google Sheet tab as an array of row objects
 * Row 1 = headers, rest = data
 */
export async function fetchSheetData(sheetUrl, gid = '0') {
  const url = buildGvizUrl(sheetUrl, gid)
  if (!url) throw new Error('Invalid Google Sheets URL')

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`)

  const csv = await response.text()
  return parseCSV(csv)
}

/**
 * Parse CSV text into array of objects using first row as headers
 */
function parseCSV(csv) {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.every(v => !v.trim())) continue // skip empty rows
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

/**
 * Map a sheet row to a school object for Supabase
 */
export function mapSheetRowToSchool(row, programTypeId, sheetConfigId) {
  return {
    school_id: row.school_id || row['school id'] || '',
    school_name: row.school_name || row['school name'] || '',
    contact_name: row.contact_name || row['contact name'] || '',
    contact_email: row.contact_email || row['contact email'] || '',
    contact_phone: row.contact_phone || row['contact phone'] || '',
    city: row.city || '',
    program_type_id: programTypeId,
    enrollment_count: parseInt(row.enrollment_count || row['enrollment count'] || '0') || 0,
    pipeline_step: parseInt(row.pipeline_step || row['pipeline step'] || '1') || 1,
    pipeline_status: row.pipeline_status || row['pipeline status'] || 'In Progress',
    assigned_trainer_email: row.assigned_trainer_email || row['assigned trainer email'] || row['assigned trainer'] || '',
    outreach_date: parseDate(row.outreach_date || row['outreach date']),
    workshop_date: parseDate(row.workshop_date || row['workshop date']),
    curriculum_start: parseDate(row.curriculum_start || row['curriculum start']),
    notes: row.notes || '',
    status: row.status || 'Active',
    last_updated: new Date().toISOString(),
    sheet_config_id: sheetConfigId,
  }
}

function parseDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

/**
 * Map a school object back to a sheet row array (for writes)
 * Returns values in the column order: A-Q
 */
export function mapSchoolToSheetRow(school) {
  return [
    school.school_id,
    school.school_name,
    school.contact_name,
    school.contact_email,
    school.contact_phone,
    school.city,
    '', // program_type filled by tab context
    school.enrollment_count,
    school.pipeline_step,
    school.pipeline_status,
    school.assigned_trainer_email,
    school.outreach_date || '',
    school.workshop_date || '',
    school.curriculum_start || '',
    school.notes,
    new Date().toISOString(),
    school.status,
  ]
}

/**
 * Write a school record back to Google Sheets via Apps Script Web App
 * Requires the user to deploy a simple Apps Script as a Web App
 * This is the recommended approach for client-side writes without exposing service account keys
 */
export async function writeToSheet(appsScriptUrl, payload) {
  if (!appsScriptUrl) {
    console.warn('No Apps Script URL configured — skipping sheet write')
    return { success: false, reason: 'no_apps_script_url' }
  }
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    return { success: true, data }
  } catch (err) {
    console.error('Sheet write failed:', err)
    return { success: false, reason: err.message }
  }
}
