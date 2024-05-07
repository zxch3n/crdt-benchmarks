import { setBenchmarkResult, gen, N, benchmarkTime, runBenchmark, logMemoryUsed, getMemUsed } from './utils.js'
import * as prng from 'lib0/prng'
import * as math from 'lib0/math'
import { createMutex } from 'lib0/mutex'
import * as t from 'lib0/testing'
import { CrdtFactory, AbstractCrdt } from './index.js' // eslint-disable-line

const initText = prng.word(gen, 100, 100)

/**
 * @param {CrdtFactory} crdtFactory
 * @param {function(string):boolean} filter
 */
export const runBenchmarkC1 = async (crdtFactory, filter) => {
  /**
   * @param {string} id
   * @param {function(AbstractCrdt):void} changeDoc1
   * @param {function(AbstractCrdt):void} changeDoc2
   * @param {function(AbstractCrdt, AbstractCrdt):void} check
   */
  const benchmarkTemplate = (id, changeDoc1, changeDoc2, check) => {
    let encodedState = null
    let updatesSize = 0
    const mux = createMutex()
    const doc1 = crdtFactory.create(update => mux(() => { updatesSize += update.length; doc2.applyUpdate(update) }))
    const doc2 = crdtFactory.create(update => mux(() => { updatesSize += update.length; doc1.applyUpdate(update) }))

    {
      doc1.insertText(0, initText)
      benchmarkTime(crdtFactory.getName(), `${id} (time)`, () => {
        doc1.transact(() => {
          changeDoc1(doc1)
        })
        doc2.transact(() => {
          changeDoc2(doc2)
        })
        check(doc1, doc2)
      })
      setBenchmarkResult(crdtFactory.getName(), `${id} (updateSize)`, `${updatesSize} bytes`)
      benchmarkTime(crdtFactory.getName(), `${id} (encodeTime)`, () => {
        encodedState = doc1.getEncodedState()
      })
      // @ts-ignore
      const documentSize = encodedState.length
      setBenchmarkResult(crdtFactory.getName(), `${id} (docSize)`, `${documentSize} bytes`)
    }
    benchmarkTime(crdtFactory.getName(), `${id} (parseTime)`, () => {
      const startHeapUsed = getMemUsed()
      // eslint-disable-next-line
      const doc = crdtFactory.load(() => { }, encodedState)
      check(doc, doc2)
      logMemoryUsed(crdtFactory.getName(), id, startHeapUsed)
    })
    const v = doc1.getVersion();
    setBenchmarkResult(crdtFactory.getName(), `${id} (versionSize)`, `${v.length} bytes`)
  }

  await runBenchmark('[C1.1] Concurrently insert & delete 100K', filter, benchmarkName => {
    const genInput = () => {
      let str = initText.length;
      const input = []
      for (let i = 0; i < 100_000; i++) {
        const index = prng.uint32(gen, 0, str)
        const insert = prng.word(gen, 3, 9)
        str += insert.length;
        input.push({ index, insert })
        if (str === index || prng.bool(gen)) {
          const insert = prng.word(gen, 2, 10)
          str += insert.length;
          input.push({ index, insert })
        } else {
          const deleteCount = prng.uint32(gen, 1, math.min(9, str - index))
          str -= deleteCount;
          input.push({ index, deleteCount })
        }
      }
      return input
    }
    const input1 = genInput()
    const input2 = genInput()
    benchmarkTemplate(
      benchmarkName,
      doc1 => {
        input1.forEach(({ index, insert, deleteCount }) => {
          if (insert !== undefined) {
            doc1.insertText(index, insert)
          } else {
            doc1.deleteText(index, deleteCount || 0)
          }
        })
      },
      doc2 => {
        input2.forEach(({ index, insert, deleteCount }) => {
          if (insert !== undefined) {
            doc2.insertText(index, insert)
          } else {
            doc2.deleteText(index, deleteCount || 0)
          }
        })
      },
      (doc1, doc2) => {
        t.assert(doc1.getText() === doc2.getText())
      }
    )
  })

  await runBenchmark('[C1.2] Concurrently set Map 100K', filter, benchmarkName => {
    const N = 30_000;
    let encodedState = null
    const docs = []
    const id = '[C1.2] Concurrently set Map 100K';
    {
      const updates = []
      const mux = createMutex()
      for (let i = 0; i < N; i++) {
        // push all created updates to the updates array
        docs.push(crdtFactory.create(update => mux(() => updates.push(update))))
      }
      for (let i = 0; i < docs.length; i++) {
        docs[i].setMap("v", i);
      }
      t.assert(updates.length >= N)
      // sync client 0 for reference
      mux(() => {
        docs[0].transact(() => {
          for (let i = 0; i < updates.length; i++) {
            docs[0].applyUpdate(updates[i])
          }
        }, true)
      })
      benchmarkTime(crdtFactory.getName(), `${id} (time)`, () => {
        mux(() => {
          docs[1].transact(() => {
            for (let i = 0; i < updates.length; i++) {
              docs[1].applyUpdate(updates[i])
            }
          }, true)
        })
      })
      setBenchmarkResult(crdtFactory.getName(), `${id} (updateSize)`, `${updates.reduce((len, update) => len + update.length, 0)} bytes`)
      benchmarkTime(crdtFactory.getName(), `${id} (encodeTime)`, () => {
        encodedState = docs[0].getEncodedState()
      })
      // @ts-ignore
      const documentSize = encodedState.length
      setBenchmarkResult(crdtFactory.getName(), `${id} (docSize)`, `${documentSize} bytes`)
    }
    benchmarkTime(crdtFactory.getName(), `${id} (parseTime)`, () => {
      const startHeapUsed = getMemUsed()
      // eslint-disable-next-line
      const doc = crdtFactory.load(() => { }, encodedState)
      logMemoryUsed(crdtFactory.getName(), id, startHeapUsed)
    })
    setBenchmarkResult(crdtFactory.getName(), `${id} (versionSize)`, `${docs[1].getVersion().length} bytes`)
  })
}
