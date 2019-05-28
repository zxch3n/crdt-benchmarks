import './bundle.js'
import './b1.js'
import './b2.js'
import './b3.js'
import { benchmarkResults, N } from './utils.js'

// print markdown table with the results
let mdTable = `| N = ${N} | Yjs | automerge |\n`
mdTable += '| :- | -: | -: |\n'
for (let id in benchmarkResults) {
  mdTable += `|${id.padEnd(73, ' ')} | ${(benchmarkResults[id]['yjs'] || '').padStart(15, ' ')} | ${(benchmarkResults[id]['automerge'] || '').padStart(15, ' ')} |\n`
}
console.log(mdTable)