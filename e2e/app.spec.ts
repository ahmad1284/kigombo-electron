import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

/**
 * Drives the built app the way a person does. Each run gets a throwaway
 * userData directory via KIGOMBO_USER_DATA, so the real ledger is never touched.
 */
let userDataDir: string
let app: ElectronApplication
let page: Page

async function launch(): Promise<void> {
  app = await electron.launch({
    args: ['.'],
    env: { ...process.env, KIGOMBO_USER_DATA: userDataDir }
  })
  page = await app.firstWindow()
  await page.waitForSelector('text=Kigombo')
}

test.beforeAll(async () => {
  userDataDir = mkdtempSync(join(tmpdir(), 'kigombo-e2e-'))
  await launch()
})

test.afterAll(async () => {
  await app?.close()
  rmSync(userDataDir, { recursive: true, force: true })
})

async function addEntry(opts: {
  direction: 'Money in' | 'Money out'
  amount: string
  wallet: string
  description: string
  date?: string
}): Promise<void> {
  await page.getByRole('button', { name: 'New entry', exact: true }).click()
  const form = page.getByRole('form', { name: 'New entry' })
  await form.getByRole('button', { name: opts.direction }).click()
  await form.getByLabel(/^Amount/).fill(opts.amount)
  await form.getByLabel('Wallet').selectOption({ label: opts.wallet })
  await form.getByLabel('Description').fill(opts.description)
  if (opts.date) await form.getByLabel('Date').fill(opts.date)
  await form.getByRole('button', { name: 'Record entry' }).click()
  await expect(form.getByRole('status')).toBeVisible()
  await page.keyboard.press('Escape')
}

test('seeds a Cash wallet on first run', async () => {
  await page.getByRole('button', { name: 'Wallets' }).click()
  await expect(page.getByRole('cell', { name: 'Cash', exact: true })).toBeVisible()
})

test('creates a second wallet', async () => {
  await page.getByPlaceholder('Name a new wallet').fill('Bank')
  await page.getByRole('button', { name: 'Add wallet' }).click()
  await expect(page.getByRole('cell', { name: 'Bank', exact: true })).toBeVisible()
})

test('records money in and money out', async () => {
  await addEntry({
    direction: 'Money in',
    amount: '1000',
    wallet: 'Bank',
    description: 'Salary'
  })
  await addEntry({
    direction: 'Money out',
    amount: '25.50',
    wallet: 'Cash',
    description: 'Groceries'
  })

  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.getByText('USD 974.50').first()).toBeVisible()
  await expect(page.getByText('Salary')).toBeVisible()
  await expect(page.getByText('Groceries')).toBeVisible()
})

test('weekly report totals both entries', async () => {
  await page.getByRole('button', { name: 'Reports' }).click()
  const totals = page.locator('dl').first()
  await expect(totals).toBeVisible()
  await expect(totals).toContainText('1,000.00')
  await expect(totals).toContainText('25.50')
  await expect(totals).toContainText('USD 974.50')
})

test('monthly report matches the weekly net', async () => {
  await page.getByRole('button', { name: 'monthly' }).click()
  const totals = page.locator('dl').first()
  await expect(totals).toContainText('1,000.00')
  await expect(totals).toContainText('USD 974.50')
})

test('editing an entry moves the totals', async () => {
  await page.getByRole('button', { name: 'Entries' }).click()
  const row = page.getByRole('row', { name: /Groceries/ })
  await row.hover()
  await row.getByRole('button', { name: /^Edit Groceries/ }).click()

  const form = page.getByRole('form', { name: 'Edit entry' })
  await form.getByLabel(/^Amount/).fill('125.50')
  await form.getByRole('button', { name: 'Save changes' }).click()

  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.getByText('USD 874.50').first()).toBeVisible()
})

test('deleting an entry reverts the totals', async () => {
  await page.getByRole('button', { name: 'Entries' }).click()
  const row = page.getByRole('row', { name: /Groceries/ })
  await row.hover()
  await row.getByRole('button', { name: /^Delete Groceries/ }).click()
  await expect(page.getByText('Groceries')).toHaveCount(0)

  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.getByText('USD 1,000.00').first()).toBeVisible()
})

test('data survives a restart', async () => {
  await app.close()
  await launch()
  await expect(page.getByText('USD 1,000.00').first()).toBeVisible()
  await expect(page.getByText('Salary')).toBeVisible()
})
