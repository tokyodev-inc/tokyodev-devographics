// Parses every YAML file in the repo and exits with an error if any fail.
//
// The API loads these files with js-yaml, and when a file fails to parse it only
// logs the error and carries on without it, so a broken file would otherwise go
// live silently. Run with `npm run validate:yaml`.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const skipDirs = new Set(['.git', 'node_modules', 'data'])
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'

const findYamlFiles = async dir => {
    const files = []
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) {
                files.push(...(await findYamlFiles(entryPath)))
            }
        } else if (/\.ya?ml$/.test(entry.name)) {
            files.push(entryPath)
        }
    }
    return files
}

const files = (await findYamlFiles(rootDir)).sort()
let errorCount = 0

for (const file of files) {
    const relativePath = path.relative(rootDir, file)
    try {
        yaml.load(await readFile(file, 'utf8'), { filename: relativePath })
    } catch (error) {
        errorCount++
        // js-yaml marks are 0-indexed
        const line = error.mark ? error.mark.line + 1 : 1
        const column = error.mark ? error.mark.column + 1 : 1
        if (isGitHubActions) {
            // shows the error inline on the pull request's changed files
            console.log(`::error file=${relativePath},line=${line},col=${column}::${error.reason ?? error.message}`)
        }
        console.error(`✗ ${error.message}\n`)
    }
}

if (errorCount > 0) {
    console.error(`${errorCount} of ${files.length} YAML files failed to parse.`)
    process.exit(1)
}
console.log(`✓ All ${files.length} YAML files parsed.`)
