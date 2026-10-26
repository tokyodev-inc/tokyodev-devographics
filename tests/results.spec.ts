import { test, expect, type Page, type Locator } from '@playwright/test'

/*

Clicks through every section of the results site, and every tab of every block,
and reports:

- strings with no translation at all (rendered as "[ja-JP] some.key")
- strings shown in English on a non-English page (fallbacks, read from the API)
- blocks that failed to render, or charts with no data
- leftover "TODO" placeholder text
- JavaScript errors and failed requests

Env vars:
- RESULTS_URL: results site to check (default http://localhost:9001)
- API_URL: API used to look up which strings are English fallbacks
  (default http://localhost:5020/graphql)
- LOCALES: comma-separated locales to check (default en-US,ja-JP)

*/

const API_URL = process.env.API_URL || 'http://localhost:5020/graphql'
const LOCALES = (process.env.LOCALES || 'en-US,ja-JP').split(',')
const EDITION_ID = 'td2026'
// same contexts the results site loads (see getTranslationContexts in monorepo/results)
const CONTEXTS = ['homepage', 'common', 'results', 'countries', 'tdresults', 'tokyodev', EDITION_ID]

// Gatsby's dev server always requests a 404 page that doesn't exist
const IGNORED_URLS = [/\/page-data\/404\.html\//]
// React development-mode warnings, failed requests (reported separately),
// and third-party pages that refuse to be embedded
const IGNORED_CONSOLE = [
    /^Warning: /,
    /^Failed to load resource/,
    /404 page could not be found/,
    /^Refused to display .* in a frame/
]

const getFallbackKeys = async (localeId: string) => {
    if (localeId === 'en-US') return new Set<string>()
    const query = `query { locale(localeId: ${localeId.replace('-', '_')}, contexts: [${CONTEXTS.join(
        ', '
    )}], enableFallbacks: true) { strings { key isFallback } } }`
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    })
    const { data, errors } = await response.json()
    if (errors) throw new Error(`Could not load ${localeId} strings: ${JSON.stringify(errors)}`)
    const strings: { key: string; isFallback: boolean }[] = data.locale.strings
    return new Set(strings.filter(s => s.isFallback).map(s => s.key))
}

// problems visible inside `scope`, labelled with `where`
const findProblems = async (scope: Locator, where: string, fallbackKeys: Set<string>) => {
    const found = await scope.evaluateAll(
        (roots, fallbackKeys) => {
            const problems: string[] = []
            for (const root of roots) {
                root.querySelectorAll('.t-missing').forEach(el =>
                    problems.push(`missing translation: ${(el as HTMLElement).dataset.key}`)
                )
                // strings rendered without <T> don't get the .t-missing class
                for (const [, key] of ((root as HTMLElement).innerText || '').matchAll(
                    /\[(?:en-US|ja-JP)\] ([\w.-]+)/g
                )) {
                    problems.push(`missing translation: ${key}`)
                }
                root.querySelectorAll('[data-key]').forEach(el => {
                    const key = (el as HTMLElement).dataset.key!
                    if (fallbackKeys.includes(key)) problems.push(`shown in English: ${key}`)
                })
                root.querySelectorAll('h3.block + .error').forEach(el =>
                    problems.push(
                        `block error in ${el.previousElementSibling?.textContent}: ${el.textContent}`
                    )
                )
                if (root.querySelector('.no-data')) problems.push('no data')
                // rows a chart couldn't draw, e.g. "No data found for bucket other_answers."
                root.querySelectorAll('.chart-row-error').forEach(el =>
                    problems.push(`chart row error: ${el.textContent}`)
                )
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
                while (walker.nextNode()) {
                    const node = walker.currentNode
                    if (!/\bTODO\b/.test(node.textContent!)) continue
                    const block = node.parentElement?.closest('[class*="tabs-wrapper-"]')
                    const blockId = block?.className.match(/tabs-wrapper-(\S+)/)?.[1]
                    const keyed = node.parentElement?.closest('[data-key]') as HTMLElement | null
                    problems.push(`TODO text in ${keyed?.dataset.key || blockId || 'page'}`)
                }
            }
            return problems
        },
        [...fallbackKeys]
    )
    return found.map(problem => `${where} › ${problem}`)
}

const getSectionPaths = async (page: Page, localeId: string) => {
    await page.goto(`/${localeId}/`, { waitUntil: 'networkidle' })
    const hrefs = await page.$$eval(`a[href^="/${localeId}/"]`, links =>
        links.map(a => a.getAttribute('href')!)
    )
    // section pages are /<locale>/<section>/; deeper links are single-block pages
    const sectionPattern = new RegExp(`^/${localeId}/([\\w-]+/)?$`)
    return [...new Set(hrefs.map(href => href.split('#')[0]))].filter(href =>
        sectionPattern.test(href)
    )
}

const checkPage = async (
    page: Page,
    path: string,
    fallbackKeys: Set<string>,
    baseURL: string
) => {
    const problems: string[] = []
    const onPageError = (error: Error) => problems.push(`${path} › JS error: ${error.message}`)
    const onConsole = msg => {
        if (msg.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(msg.text()))) {
            problems.push(`${path} › console error: ${msg.text().slice(0, 300)}`)
        }
    }
    // only requests to the results site and API; third-party embeds aren't our data
    const ownOrigins = [new URL(baseURL).origin, new URL(API_URL).origin]
    const onResponse = response => {
        const url = response.url()
        if (
            response.status() >= 400 &&
            ownOrigins.includes(new URL(url).origin) &&
            !IGNORED_URLS.some(re => re.test(url))
        ) {
            problems.push(`${path} › HTTP ${response.status()}: ${response.url()}`)
        }
    }
    page.on('pageerror', onPageError)
    page.on('console', onConsole)
    page.on('response', onResponse)

    await page.goto(path, { waitUntil: 'networkidle' })
    problems.push(...(await findProblems(page.locator('main, body').first(), path, fallbackKeys)))

    // only the selected tab's content is rendered, so click through each one
    const blocks = page.locator('.tabs-wrapper')
    for (let b = 0; b < (await blocks.count()); b++) {
        const block = blocks.nth(b)
        const blockId = (await block.getAttribute('class'))!.match(/tabs-wrapper-(\S+)/)?.[1]
        const tabs = block.locator('[role=tab]')
        for (let t = 1; t < (await tabs.count()); t++) {
            const tab = tabs.nth(t)
            const tabLabel = (await tab.innerText()).trim()
            await tab.scrollIntoViewIfNeeded()
            await tab.click()
            await page.waitForLoadState('networkidle')
            problems.push(
                ...(await findProblems(
                    block.locator('[role=tabpanel][data-state=active]'),
                    `${path} › ${blockId} › ${tabLabel} tab`,
                    fallbackKeys
                ))
            )
        }
    }

    page.off('pageerror', onPageError)
    page.off('console', onConsole)
    page.off('response', onResponse)
    return [...new Set(problems)]
}

for (const localeId of LOCALES) {
    test(`results site has no errors (${localeId})`, async ({ page, baseURL }) => {
        const fallbackKeys = await getFallbackKeys(localeId)
        const paths = await getSectionPaths(page, localeId)
        expect(paths.length, 'found no section links in the nav').toBeGreaterThan(1)

        for (const path of paths) {
            await test.step(path, async () => {
                const problems = await checkPage(page, path, fallbackKeys, baseURL!)
                expect.soft(problems, `problems on ${path}`).toEqual([])
            })
        }
    })
}
