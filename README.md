# CRDT benchmarks

> The primary role of these benchmarks should be to serve as indicators of the
> absence of performance pitfalls rather than as measures of which project is
> superior. This is because different projects consistently make different
> trade-offs. It is inaccurate to claim that Project A is superior to Project B
> simply because A performs better in certain benchmarks, while Project B may
> excel in other areas by a significant margin.

> A collection of reproducible benchmarks. _PRs are welcome._

```sh
# Install Node.js https://nodejs.org
npm i
# Run all benchmarks (takes quite a long time)
npm start
# Run all benchmarks using bun
npm start:bun
# Run a specific benchmark (e.g. yjs)
cd benchmarks/yjs && npm start
# Run a specific benchmark in the browser
cd benchmarks/yjs && npm start:browser
# print collected results
npm run table
```

## Benchmarks

#### B1: No conflicts

Simulate two clients. One client modifies a text object and sends update
messages to the other client. We measure the time to perform the task (`time`),
the amount of data exchanged (`avgUpdateSize`), the size of the encoded document
after the task is performed (`docSize`), the time to parse the encoded document
(`parseTime`), and the memory used to hold the decoded document (`memUsed`).

#### B2: Two users producing conflicts

Simulate two clients. Both start with a synced text object containing 100
characters. Both clients modify the text object in a single transaction and then
send their changes to the other client. We measure the time to sync concurrent
changes into a single client (`time`), the size of the update messages
(`updateSize`), the size of the encoded document after the task is performed
(`docSize`), the time to parse the encoded document (`parseTime`), and the
memory used to hold the decoded document (`memUsed`).

#### B3: Many conflicts

Simulate `√N` concurrent actions. We measure the time to perform the task and
sync all clients (`time`), the size of the update messages (`updateSize`), the
size of the encoded document after the task is performed (`docSize`), the time
to parse the encoded document (`parseTime`), and the memory used to hold the
decoded document (`memUsed`). The logarithm of `N` was chosen because `√N`
concurrent actions may result in up to `√N^2 - 1` conflicts (apply action 1: 0
conlict; apply action2: 1 conflict, apply action 2: 2 conflicts, ..).

#### B4: Real-world editing dataset

Replay a real-world editing dataset. This dataset contains the
character-by-character editing trace of a large-ish text document, the LaTeX
source of this paper: https://arxiv.org/abs/1608.03960

Source: https://github.com/automerge/automerge-perf/tree/master/edit-by-index

- 182,315 single-character insertion operations
- 77,463 single-character deletion operations
- 259,778 operations totally
- 104,852 characters in the final document

We simulate one client replaying all changes and storing each update. We measure
the time to replay the changes and extract the content (`time`), the size of all
update messages (`updateSize`), the size of the encoded document after the task
is performed (`docSize`), the time to encode the document (`encodeTime`), the
time to parse the encoded document and extract the content (`parseTime`), and
the memory used to hold the decoded document in memory (`memUsed`).

** For now we replay all actions in a single transaction, otherwise Automerge is
running out of memory.

##### [B4 x 100] Real-world editing dataset 100 times

Replay the [B4] dataset one hundred times. The final document has a size of over
10 million characters. As comparison, the book "Game of Thrones: A Song of Ice
and Fire" is only 1.6 million characters long (including whitespace).

- 18,231,500 single-character insertion operations
- 7,746,300 single-character deletion operations
- 25,977,800 operations totally
- 10,485,200 characters in the final document

### Results

**Notes**

- The benchmarks were performed on MacBook Pro M1 2020 with 16GB RAM
- loro-old is the version of loro on 2023-11-10, it's compiled from
  [this commit](https://github.com/loro-dev/loro/tree/c1613ee680c6a4757e55fcda76e4f5f627daeb56).
  Loro has undergone numerous changes since then, particularly in terms of
  [encoding schema](https://github.com/loro-dev/loro/pull/219), shifting from a
  performance-focused version to one that prioritizes compatibility. Because we
  want Loro to have good backward and forward compatibility after reaching
  version 1.0, we have adopted a more easily extensible encoding method. It is
  slower than the encoding method used in the `loro-old` version, but it better
  ensures our ability to iterate quickly after reaching version 1.0 without
  introducing breaking changes.
- There is a more exchaustive benchmark at the bottom that only runs benchmarks
  on Yjs.
- `memUsed` only approximates the amount of memory used. We run the JavaScript
  garbage collector and use the heap-size difference before and after the
  benchmark is performed. If the heap is highly fragmented, the heap size might
  be larger than the actual amount of data stored in the heap. In some cases
  this even leads to a `memUsed` of less than zero.
- `memUsed` does not measure the memory usage of the wasm runtime.
- Automerge can perform the `B4` benchmark in about 1 second (see `time`) if all
  changes are applied within a single `change` transaction. However, our
  benchmarks test individual edits that generate individual update events as
  this more closely simulates actual user behavior. See #21
- Note that `parseTime` is significantly higher with `automerge` and `loro` when
  the initial document is not empty (e.g. when syncing content from a remote
  server).
- Loro and Automerge can store a complete DAG of editing history for each
  keystroke, but Yjs requires additional storage for a Version Vector + Delete
  Set for each version saved, which incurs significant extra overhead beyond the
  document size reported.

| N = 6000                                                                 |              yjs |           ywasm |             loro |         loro-old |        automerge |  automerge-wasm |
| :----------------------------------------------------------------------- | ---------------: | --------------: | ---------------: | ---------------: | ---------------: | --------------: |
| Version                                                                  |          13.6.15 |          0.17.4 |     1.0.0-beta.2 |           0.15.2 |           2.1.10 |           0.9.0 |
| Bundle size                                                              |     84,017 bytes |   938,991 bytes |  2,919,363 bytes |  1,583,094 bytes |  1,696,176 bytes | 1,701,136 bytes |
| Bundle size (gzipped)                                                    |     25,105 bytes |   284,616 bytes |    894,460 bytes |    592,039 bytes |    591,049 bytes |   594,071 bytes |
| [B1.1] Append N characters (time)                                        |           141 ms |          171 ms |           164 ms |           115 ms |           279 ms |          110 ms |
| [B1.1] Append N characters (avgUpdateSize)                               |         27 bytes |        27 bytes |         88 bytes |         58 bytes |        121 bytes |       121 bytes |
| [B1.1] Append N characters (encodeTime)                                  |             1 ms |            0 ms |             3 ms |             0 ms |             5 ms |            6 ms |
| [B1.1] Append N characters (docSize)                                     |      6,031 bytes |     6,031 bytes |     12,382 bytes |      6,219 bytes |      3,992 bytes |     3,992 bytes |
| [B1.1] Append N characters (memUsed)                                     |              0 B |             0 B |              0 B |              0 B |              0 B |             0 B |
| [B1.1] Append N characters (parseTime)                                   |            22 ms |           65 ms |            28 ms |            28 ms |            59 ms |           61 ms |
| [B1.2] Insert string of length N (time)                                  |             1 ms |            1 ms |             0 ms |             0 ms |            18 ms |           14 ms |
| [B1.2] Insert string of length N (avgUpdateSize)                         |      6,031 bytes |     6,031 bytes |      6,089 bytes |      6,088 bytes |      6,201 bytes |     6,201 bytes |
| [B1.2] Insert string of length N (encodeTime)                            |             0 ms |            0 ms |             0 ms |             0 ms |             2 ms |            2 ms |
| [B1.2] Insert string of length N (docSize)                               |      6,031 bytes |     6,031 bytes |     12,313 bytes |      6,146 bytes |      3,974 bytes |     3,974 bytes |
| [B1.2] Insert string of length N (memUsed)                               |          81.9 kB |           568 B |            568 B |            824 B |           6.5 kB |         10.6 kB |
| [B1.2] Insert string of length N (parseTime)                             |            27 ms |           47 ms |            27 ms |            26 ms |            29 ms |           30 ms |
| [B1.3] Prepend N characters (time)                                       |           118 ms |           30 ms |           111 ms |            47 ms |           272 ms |           73 ms |
| [B1.3] Prepend N characters (avgUpdateSize)                              |         27 bytes |        26 bytes |         87 bytes |         57 bytes |        116 bytes |       116 bytes |
| [B1.3] Prepend N characters (encodeTime)                                 |             2 ms |            0 ms |             2 ms |             1 ms |             4 ms |            4 ms |
| [B1.3] Prepend N characters (docSize)                                    |      6,041 bytes |     6,040 bytes |     15,414 bytes |      6,165 bytes |      3,988 bytes |     3,988 bytes |
| [B1.3] Prepend N characters (memUsed)                                    |         978.7 kB |             0 B |          15.6 kB |              0 B |           6.8 kB |             0 B |
| [B1.3] Prepend N characters (parseTime)                                  |            45 ms |           38 ms |            27 ms |            37 ms |            73 ms |           47 ms |
| [B1.4] Insert N characters at random positions (time)                    |           128 ms |          101 ms |           113 ms |            51 ms |           268 ms |           89 ms |
| [B1.4] Insert N characters at random positions (avgUpdateSize)           |         29 bytes |        29 bytes |         88 bytes |         58 bytes |        121 bytes |       121 bytes |
| [B1.4] Insert N characters at random positions (encodeTime)              |             3 ms |            0 ms |             2 ms |             1 ms |             6 ms |            5 ms |
| [B1.4] Insert N characters at random positions (docSize)                 |     29,571 bytes |    29,554 bytes |     39,040 bytes |     29,503 bytes |     24,743 bytes |    24,743 bytes |
| [B1.4] Insert N characters at random positions (memUsed)                 |           1.2 MB |             0 B |           1.6 kB |              0 B |           1.6 kB |             0 B |
| [B1.4] Insert N characters at random positions (parseTime)               |            46 ms |           30 ms |            27 ms |            26 ms |            73 ms |           64 ms |
| [B1.5] Insert N words at random positions (time)                         |           149 ms |          264 ms |           112 ms |            54 ms |           539 ms |          291 ms |
| [B1.5] Insert N words at random positions (avgUpdateSize)                |         36 bytes |        36 bytes |         95 bytes |         65 bytes |        131 bytes |       131 bytes |
| [B1.5] Insert N words at random positions (encodeTime)                   |             6 ms |            1 ms |             3 ms |             1 ms |            14 ms |           15 ms |
| [B1.5] Insert N words at random positions (docSize)                      |     87,868 bytes |    87,924 bytes |    135,713 bytes |     98,901 bytes |     96,203 bytes |    96,203 bytes |
| [B1.5] Insert N words at random positions (memUsed)                      |           2.6 MB |             0 B |           1.4 kB |              0 B |              0 B |             0 B |
| [B1.5] Insert N words at random positions (parseTime)                    |            50 ms |           33 ms |            27 ms |            33 ms |           101 ms |          111 ms |
| [B1.6] Insert string, then delete it (time)                              |             1 ms |            0 ms |             2 ms |             1 ms |            39 ms |           31 ms |
| [B1.6] Insert string, then delete it (avgUpdateSize)                     |      6,053 bytes |     6,052 bytes |      6,189 bytes |      6,179 bytes |      6,338 bytes |     6,338 bytes |
| [B1.6] Insert string, then delete it (encodeTime)                        |             0 ms |            0 ms |             0 ms |             0 ms |             3 ms |            2 ms |
| [B1.6] Insert string, then delete it (docSize)                           |      6,040 bytes |     6,039 bytes |      6,409 bytes |      6,145 bytes |      3,993 bytes |     3,993 bytes |
| [B1.6] Insert string, then delete it (memUsed)                           |         178.1 kB |            1 kB |           1.8 kB |            976 B |              8 B |           472 B |
| [B1.6] Insert string, then delete it (parseTime)                         |            29 ms |           29 ms |            26 ms |            28 ms |            52 ms |           44 ms |
| [B1.7] Insert/Delete strings at random positions (time)                  |           153 ms |          112 ms |           136 ms |            60 ms |           423 ms |          212 ms |
| [B1.7] Insert/Delete strings at random positions (avgUpdateSize)         |         31 bytes |        31 bytes |        100 bytes |         61 bytes |        135 bytes |       135 bytes |
| [B1.7] Insert/Delete strings at random positions (encodeTime)            |             3 ms |            1 ms |             3 ms |             1 ms |            13 ms |           11 ms |
| [B1.7] Insert/Delete strings at random positions (docSize)               |     41,917 bytes |    41,592 bytes |     81,700 bytes |     51,470 bytes |     59,281 bytes |    59,281 bytes |
| [B1.7] Insert/Delete strings at random positions (memUsed)               |           1.3 MB |             0 B |            592 B |              0 B |              0 B |             0 B |
| [B1.7] Insert/Delete strings at random positions (parseTime)             |            53 ms |           41 ms |            25 ms |            27 ms |            80 ms |           78 ms |
| [B1.8] Append N numbers (time)                                           |           140 ms |           59 ms |           155 ms |            73 ms |           448 ms |          113 ms |
| [B1.8] Append N numbers (avgUpdateSize)                                  |         32 bytes |        32 bytes |         94 bytes |         62 bytes |        125 bytes |       125 bytes |
| [B1.8] Append N numbers (encodeTime)                                     |             2 ms |            0 ms |             2 ms |             2 ms |             6 ms |            6 ms |
| [B1.8] Append N numbers (docSize)                                        |     35,641 bytes |    35,634 bytes |     71,568 bytes |     47,625 bytes |     26,985 bytes |    26,985 bytes |
| [B1.8] Append N numbers (memUsed)                                        |              0 B |             0 B |         137.1 kB |         186.6 kB |          64.5 kB |             0 B |
| [B1.8] Append N numbers (parseTime)                                      |            32 ms |           43 ms |            31 ms |            29 ms |            76 ms |           67 ms |
| [B1.9] Insert Array of N numbers (time)                                  |             3 ms |            3 ms |            13 ms |             9 ms |            47 ms |           22 ms |
| [B1.9] Insert Array of N numbers (avgUpdateSize)                         |     35,653 bytes |    35,657 bytes |     35,715 bytes |     35,717 bytes |     31,199 bytes |    31,199 bytes |
| [B1.9] Insert Array of N numbers (encodeTime)                            |             1 ms |            0 ms |             2 ms |             1 ms |             4 ms |            2 ms |
| [B1.9] Insert Array of N numbers (docSize)                               |     35,653 bytes |    35,657 bytes |     71,578 bytes |     47,646 bytes |     26,953 bytes |    26,953 bytes |
| [B1.9] Insert Array of N numbers (memUsed)                               |          64.1 kB |        160.1 kB |           1.1 kB |           1.2 kB |          62.6 kB |          6.2 kB |
| [B1.9] Insert Array of N numbers (parseTime)                             |            43 ms |           29 ms |            31 ms |            29 ms |            56 ms |           44 ms |
| [B1.10] Prepend N numbers (time)                                         |           157 ms |           31 ms |           125 ms |            53 ms |           484 ms |          159 ms |
| [B1.10] Prepend N numbers (avgUpdateSize)                                |         32 bytes |        32 bytes |         93 bytes |         61 bytes |        120 bytes |       120 bytes |
| [B1.10] Prepend N numbers (encodeTime)                                   |             3 ms |            1 ms |             3 ms |             1 ms |             6 ms |            6 ms |
| [B1.10] Prepend N numbers (docSize)                                      |     35,669 bytes |    35,665 bytes |     76,773 bytes |     47,645 bytes |     26,987 bytes |    26,987 bytes |
| [B1.10] Prepend N numbers (memUsed)                                      |             2 MB |             0 B |          46.7 kB |            656 B |         186.1 kB |             0 B |
| [B1.10] Prepend N numbers (parseTime)                                    |            53 ms |           33 ms |            48 ms |            39 ms |            65 ms |           67 ms |
| [B1.11] Insert N numbers at random positions (time)                      |           160 ms |          121 ms |           125 ms |            56 ms |           517 ms |          121 ms |
| [B1.11] Insert N numbers at random positions (avgUpdateSize)             |         34 bytes |        34 bytes |         94 bytes |         60 bytes |        125 bytes |       125 bytes |
| [B1.11] Insert N numbers at random positions (encodeTime)                |             2 ms |            1 ms |             4 ms |             1 ms |             8 ms |            6 ms |
| [B1.11] Insert N numbers at random positions (docSize)                   |     59,132 bytes |    59,137 bytes |    100,632 bytes |     70,901 bytes |     47,746 bytes |    47,746 bytes |
| [B1.11] Insert N numbers at random positions (memUsed)                   |             2 MB |         50.8 kB |            920 B |              0 B |          62.4 kB |         91.2 kB |
| [B1.11] Insert N numbers at random positions (parseTime)                 |            52 ms |           50 ms |            58 ms |            41 ms |           428 ms |           80 ms |
| [B2.1] Concurrently insert string of length N at index 0 (time)          |             1 ms |            0 ms |             1 ms |             0 ms |            75 ms |           32 ms |
| [B2.1] Concurrently insert string of length N at index 0 (updateSize)    |      6,094 bytes |     6,094 bytes |      6,188 bytes |      9,244 bytes |      9,499 bytes |     9,499 bytes |
| [B2.1] Concurrently insert string of length N at index 0 (encodeTime)    |             0 ms |            0 ms |             0 ms |             0 ms |             7 ms |            5 ms |
| [B2.1] Concurrently insert string of length N at index 0 (docSize)       |     12,151 bytes |    12,151 bytes |     24,735 bytes |     12,281 bytes |      8,011 bytes |     8,011 bytes |
| [B2.1] Concurrently insert string of length N at index 0 (memUsed)       |              0 B |           576 B |            656 B |            424 B |          10.6 kB |             0 B |
| [B2.1] Concurrently insert string of length N at index 0 (parseTime)     |            28 ms |           34 ms |            30 ms |            27 ms |            60 ms |           48 ms |
| [B2.2] Concurrently insert N characters at random positions (time)       |            46 ms |          166 ms |            55 ms |           125 ms |           270 ms |          399 ms |
| [B2.2] Concurrently insert N characters at random positions (updateSize) |     33,420 bytes |    33,444 bytes |     23,779 bytes |    350,337 bytes |     27,476 bytes | 1,093,293 bytes |
| [B2.2] Concurrently insert N characters at random positions (encodeTime) |             2 ms |            1 ms |             4 ms |             1 ms |             6 ms |           11 ms |
| [B2.2] Concurrently insert N characters at random positions (docSize)    |     66,808 bytes |    66,852 bytes |     79,937 bytes |     59,358 bytes |     50,686 bytes |    50,704 bytes |
| [B2.2] Concurrently insert N characters at random positions (memUsed)    |           2.5 MB |             0 B |              0 B |            320 B |              0 B |             0 B |
| [B2.2] Concurrently insert N characters at random positions (parseTime)  |            67 ms |           69 ms |            27 ms |            27 ms |            51 ms |           95 ms |
| [B2.3] Concurrently insert N words at random positions (time)            |           105 ms |          459 ms |            68 ms |           120 ms |           435 ms |          630 ms |
| [B2.3] Concurrently insert N words at random positions (updateSize)      |     89,143 bytes |    88,994 bytes |     62,640 bytes |    408,723 bytes |    122,485 bytes | 1,185,202 bytes |
| [B2.3] Concurrently insert N words at random positions (encodeTime)      |             7 ms |            2 ms |             7 ms |             3 ms |            28 ms |           35 ms |
| [B2.3] Concurrently insert N words at random positions (docSize)         |    178,428 bytes |   178,130 bytes |    268,884 bytes |    197,284 bytes |    185,019 bytes |   191,498 bytes |
| [B2.3] Concurrently insert N words at random positions (memUsed)         |           5.5 MB |             0 B |              0 B |            144 B |          41.2 kB |        243.2 kB |
| [B2.3] Concurrently insert N words at random positions (parseTime)       |            82 ms |           67 ms |            31 ms |            30 ms |           134 ms |          184 ms |
| [B2.4] Concurrently insert & delete (time)                               |           145 ms |        1,243 ms |           118 ms |           282 ms |           653 ms |        1,311 ms |
| [B2.4] Concurrently insert & delete (updateSize)                         |    140,984 bytes |   141,122 bytes |    123,725 bytes |    798,123 bytes |    298,810 bytes | 2,395,876 bytes |
| [B2.4] Concurrently insert & delete (encodeTime)                         |             6 ms |            3 ms |            14 ms |             4 ms |            43 ms |           56 ms |
| [B2.4] Concurrently insert & delete (docSize)                            |    282,112 bytes |   282,358 bytes |    392,151 bytes |    304,592 bytes |    293,831 bytes |   307,291 bytes |
| [B2.4] Concurrently insert & delete (memUsed)                            |           8.8 MB |             0 B |            424 B |            328 B |              0 B |             0 B |
| [B2.4] Concurrently insert & delete (parseTime)                          |           105 ms |           73 ms |            34 ms |            31 ms |           185 ms |          269 ms |
| [B3.1] 20√N clients concurrently set number in Map (time)                |            54 ms |           60 ms |            27 ms |            32 ms |         1,058 ms |           21 ms |
| [B3.1] 20√N clients concurrently set number in Map (updateSize)          |     49,167 bytes |    49,162 bytes |    132,376 bytes |     63,832 bytes |    283,296 bytes |   283,296 bytes |
| [B3.1] 20√N clients concurrently set number in Map (encodeTime)          |             3 ms |            1 ms |            16 ms |             1 ms |             9 ms |           12 ms |
| [B3.1] 20√N clients concurrently set number in Map (docSize)             |     36,763 bytes |    36,751 bytes |     78,764 bytes |     38,428 bytes |     86,165 bytes |    86,164 bytes |
| [B3.1] 20√N clients concurrently set number in Map (memUsed)             |         768.7 kB |             0 B |         170.7 kB |              0 B |           1.1 kB |             0 B |
| [B3.1] 20√N clients concurrently set number in Map (parseTime)           |            57 ms |           67 ms |            83 ms |            49 ms |            59 ms |           54 ms |
| [B3.2] 20√N clients concurrently set Object in Map (time)                |            55 ms |           62 ms |            27 ms |            40 ms |         1,126 ms |           28 ms |
| [B3.2] 20√N clients concurrently set Object in Map (updateSize)          |     85,084 bytes |    85,073 bytes |    171,370 bytes |     99,753 bytes |    398,090 bytes |   325,370 bytes |
| [B3.2] 20√N clients concurrently set Object in Map (encodeTime)          |             2 ms |            1 ms |            18 ms |             2 ms |            21 ms |           17 ms |
| [B3.2] 20√N clients concurrently set Object in Map (docSize)             |     72,682 bytes |    72,659 bytes |     84,255 bytes |     75,227 bytes |    112,588 bytes |    93,401 bytes |
| [B3.2] 20√N clients concurrently set Object in Map (memUsed)             |         497.9 kB |             0 B |          12.4 kB |            184 B |              0 B |             0 B |
| [B3.2] 20√N clients concurrently set Object in Map (parseTime)           |            73 ms |           68 ms |            83 ms |            48 ms |            68 ms |           59 ms |
| [B3.3] 20√N clients concurrently set String in Map (time)                |           124 ms |           61 ms |            63 ms |            73 ms |         1,869 ms |          166 ms |
| [B3.3] 20√N clients concurrently set String in Map (updateSize)          |  7,826,229 bytes | 7,826,225 bytes |  7,912,520 bytes |  7,840,917 bytes |  8,063,440 bytes | 8,063,440 bytes |
| [B3.3] 20√N clients concurrently set String in Map (encodeTime)          |            56 ms |            5 ms |            70 ms |            23 ms |            59 ms |           61 ms |
| [B3.3] 20√N clients concurrently set String in Map (docSize)             |  7,813,826 bytes | 7,813,814 bytes |    241,646 bytes |  7,815,537 bytes |     97,997 bytes |    98,008 bytes |
| [B3.3] 20√N clients concurrently set String in Map (memUsed)             |           8.5 MB |             0 B |         266.1 kB |            600 B |              0 B |             0 B |
| [B3.3] 20√N clients concurrently set String in Map (parseTime)           |           141 ms |           75 ms |           161 ms |            44 ms |            80 ms |           76 ms |
| [B3.4] 20√N clients concurrently insert text in Array (time)             |            45 ms |           49 ms |           195 ms |            28 ms |         1,768 ms |           19 ms |
| [B3.4] 20√N clients concurrently insert text in Array (updateSize)       |     52,751 bytes |    52,735 bytes |    137,490 bytes |     70,514 bytes |    311,830 bytes |   285,330 bytes |
| [B3.4] 20√N clients concurrently insert text in Array (encodeTime)       |             1 ms |            0 ms |            13 ms |             1 ms |            13 ms |            7 ms |
| [B3.4] 20√N clients concurrently insert text in Array (docSize)          |     26,596 bytes |    26,580 bytes |    100,791 bytes |     47,943 bytes |     96,423 bytes |    86,519 bytes |
| [B3.4] 20√N clients concurrently insert text in Array (memUsed)          |         791.4 kB |        261.6 kB |         274.4 kB |          74.8 kB |              0 B |         53.5 kB |
| [B3.4] 20√N clients concurrently insert text in Array (parseTime)        |            55 ms |           37 ms |            94 ms |            30 ms |            43 ms |           37 ms |
| [B4] Apply real-world editing dataset (time)                             |         2,616 ms |       17,556 ms |         2,271 ms |           768 ms |         7,109 ms |        2,775 ms |
| [B4] Apply real-world editing dataset (encodeTime)                       |             4 ms |            8 ms |            11 ms |             3 ms |           165 ms |          161 ms |
| [B4] Apply real-world editing dataset (docSize)                          |    226,981 bytes |   226,981 bytes |    230,556 bytes |    260,813 bytes |    129,116 bytes |   129,116 bytes |
| [B4] Apply real-world editing dataset (parseTime)                        |            27 ms |           22 ms |             6 ms |             4 ms |         1,185 ms |        1,123 ms |
| [B4] Apply real-world editing dataset (memUsed)                          |           2.9 MB |             0 B |              0 B |              0 B |              0 B |             0 B |
| [B4x100] Apply real-world editing dataset 100 times (time)               |       279,705 ms |         skipped |       233,739 ms |        75,122 ms |          skipped |         skipped |
| [B4x100] Apply real-world editing dataset 100 times (encodeTime)         |           417 ms |         skipped |           743 ms |           205 ms |          skipped |         skipped |
| [B4x100] Apply real-world editing dataset 100 times (docSize)            | 22,694,543 bytes |         skipped | 21,016,454 bytes | 26,826,427 bytes |          skipped |         skipped |
| [B4x100] Apply real-world editing dataset 100 times (parseTime)          |         1,270 ms |         skipped |            66 ms |           200 ms |          skipped |         skipped |
| [B4x100] Apply real-world editing dataset 100 times (memUsed)            |         314.1 MB |         skipped |           1.6 kB |           2.7 kB |          skipped |         skipped |
| [B3.5] 20√N clients concurrently insert text (time)                      |            42 ms |           49 ms |           212 ms |           115 ms |         1,869 ms |           36 ms |
| [B3.5] 20√N clients concurrently insert text (updateSize)                |     48,129 bytes |    48,135 bytes |    132,870 bytes |     68,978 bytes |    298,020 bytes |   298,020 bytes |
| [B3.5] 20√N clients concurrently insert text (encodeTime)                |             1 ms |            0 ms |            13 ms |             1 ms |            12 ms |           16 ms |
| [B3.5] 20√N clients concurrently insert text (docSize)                   |     24,313 bytes |    24,325 bytes |    102,818 bytes |     48,053 bytes |     90,768 bytes |    90,781 bytes |
| [B3.5] 20√N clients concurrently insert text (memUsed)                   |         375.4 kB |             0 B |             1 kB |            600 B |              0 B |             0 B |
| [B3.5] 20√N clients concurrently insert text (parseTime)                 |            38 ms |           38 ms |            64 ms |            63 ms |            67 ms |           55 ms |
| [C1.1] Concurrently insert & delete 100K (time)                          |        27,138 ms |         skipped |         2,335 ms |          skipped |        50,692 ms |         skipped |
| [C1.1] Concurrently insert & delete 100K (updateSize)                    |  4,908,122 bytes |         skipped |  4,269,521 bytes |          skipped | 10,326,487 bytes |         skipped |
| [C1.1] Concurrently insert & delete 100K (encodeTime)                    |           129 ms |         skipped |           210 ms |          skipped |           837 ms |         skipped |
| [C1.1] Concurrently insert & delete 100K (docSize)                       |  4,908,186 bytes |         skipped |  6,748,052 bytes |          skipped |  5,404,289 bytes |         skipped |
| [C1.1] Concurrently insert & delete 100K (memUsed)                       |         137.8 MB |         skipped |            552 B |          skipped |           1.4 MB |         skipped |
| [C1.1] Concurrently insert & delete 100K (parseTime)                     |         1,653 ms |         skipped |            78 ms |          skipped |         7,308 ms |         skipped |
| [C1.1] Concurrently insert & delete 100K (versionSize)                   |    222,681 bytes |         skipped |         28 bytes |          skipped |         64 bytes |         skipped |
| [C1.2] Concurrently set Map 100K (time)                                  |        31,598 ms |         skipped |           488 ms |          skipped |       472,547 ms |         skipped |
| [C1.2] Concurrently set Map 100K (updateSize)                            |    980,804 bytes |         skipped |  2,601,744 bytes |          skipped |  5,541,744 bytes |         skipped |
| [C1.2] Concurrently set Map 100K (encodeTime)                            |            60 ms |         skipped |           203 ms |          skipped |         2,652 ms |         skipped |
| [C1.2] Concurrently set Map 100K (docSize)                               |    738,949 bytes |         skipped |  1,539,209 bytes |          skipped |  1,743,081 bytes |         skipped |
| [C1.2] Concurrently set Map 100K (memUsed)                               |          18.1 MB |         skipped |            904 B |          skipped |              0 B |         skipped |
| [C1.2] Concurrently set Map 100K (parseTime)                             |         4,069 ms |         skipped |           631 ms |          skipped |           338 ms |         skipped |
| [C1.2] Concurrently set Map 100K (versionSize)                           |    416,246 bytes |         skipped |    314,810 bytes |          skipped |  1,949,999 bytes |         skipped |

##### Older benchmark results that include automerge & delta-crdts

| N = 6000                                                                 | [Yjs](https://github.com/yjs/yjs) | [Automerge](https://github.com/automerge/automerge) | [delta-crdts](https://github.com/peer-base/js-delta-crdts) |
| :----------------------------------------------------------------------- | --------------------------------: | --------------------------------------------------: | ---------------------------------------------------------: |
| Version                                                                  |                            13.3.0 |                                              0.14.1 |                                                     0.10.3 |
| Bundle size                                                              |                       65923 bytes |                                        259763 bytes |                                               227573 bytes |
| Bundle size (gzipped)                                                    |                       19377 bytes |                                         61478 bytes |                                                64388 bytes |
| [B1.1] Append N characters (time)                                        |                            303 ms |                                             2460 ms |                                                    9595 ms |
| [B1.1] Append N characters (avgUpdateSize)                               |                          27 bytes |                                           326 bytes |                                                   46 bytes |
| [B1.1] Append N characters (docSize)                                     |                        6031 bytes |                                       2161851 bytes |                                               186031 bytes |
| [B1.1] Append N characters (memUsed)                                     |                          372.1 kB |                                             74.7 MB |                                                     2.4 MB |
| [B1.1] Append N characters (parseTime)                                   |                             18 ms |                                              737 ms |                                                      48 ms |
| [B1.2] Insert string of length N (time)                                  |                              7 ms |                                             2981 ms |                                                    9592 ms |
| [B1.2] Insert string of length N (avgUpdateSize)                         |                        6031 bytes |                                       1484719 bytes |                                               275992 bytes |
| [B1.2] Insert string of length N (docSize)                               |                        6031 bytes |                                       1569051 bytes |                                               186031 bytes |
| [B1.2] Insert string of length N (memUsed)                               |                               0 B |                                             53.3 MB |                                                       2 MB |
| [B1.2] Insert string of length N (parseTime)                             |                             19 ms |                                              516 ms |                                                      44 ms |
| [B1.3] Prepend N characters (time)                                       |                            280 ms |                                            83488 ms |                                                    8932 ms |
| [B1.3] Prepend N characters (avgUpdateSize)                              |                          27 bytes |                                           290 bytes |                                                   38 bytes |
| [B1.3] Prepend N characters (docSize)                                    |                        6041 bytes |                                       1946994 bytes |                                               186031 bytes |
| [B1.3] Prepend N characters (memUsed)                                    |                            3.7 MB |                                             67.6 MB |                                                     1.8 MB |
| [B1.3] Prepend N characters (parseTime)                                  |                             55 ms |                                            83509 ms |                                                     884 ms |
| [B1.4] Insert N characters at random positions (time)                    |                            311 ms |                                             3255 ms |                                                    9487 ms |
| [B1.4] Insert N characters at random positions (avgUpdateSize)           |                          29 bytes |                                           326 bytes |                                                   46 bytes |
| [B1.4] Insert N characters at random positions (docSize)                 |                       29614 bytes |                                       2159192 bytes |                                               186031 bytes |
| [B1.4] Insert N characters at random positions (memUsed)                 |                            3.4 MB |                                               71 MB |                                                     1.6 MB |
| [B1.4] Insert N characters at random positions (parseTime)               |                             57 ms |                                             1215 ms |                                                     728 ms |
| [B1.5] Insert N words at random positions (time)                         |                            376 ms |                                            12090 ms |                                                  471437 ms |
| [B1.5] Insert N words at random positions (avgUpdateSize)                |                          36 bytes |                                          1587 bytes |                                                  277 bytes |
| [B1.5] Insert N words at random positions (docSize)                      |                       87826 bytes |                                      10148335 bytes |                                              1122045 bytes |
| [B1.5] Insert N words at random positions (memUsed)                      |                            7.6 MB |                                            330.9 MB |                                                    16.2 MB |
| [B1.5] Insert N words at random positions (parseTime)                    |                             65 ms |                                             4106 ms |                                                    8509 ms |
| [B1.6] Insert string, then delete it (time)                              |                              6 ms |                                             2715 ms |                                                   31058 ms |
| [B1.6] Insert string, then delete it (avgUpdateSize)                     |                        6053 bytes |                                       1412719 bytes |                                               413992 bytes |
| [B1.6] Insert string, then delete it (docSize)                           |                          38 bytes |                                       1497051 bytes |                                               240035 bytes |
| [B1.6] Insert string, then delete it (memUsed)                           |                               0 B |                                             37.7 MB |                                                        0 B |
| [B1.6] Insert string, then delete it (parseTime)                         |                             27 ms |                                              335 ms |                                                      57 ms |
| [B1.7] Insert/Delete strings at random positions (time)                  |                            378 ms |                                             6347 ms |                                                  218372 ms |
| [B1.7] Insert/Delete strings at random positions (avgUpdateSize)         |                          31 bytes |                                          1102 bytes |                                                  195 bytes |
| [B1.7] Insert/Delete strings at random positions (docSize)               |                       28691 bytes |                                       7085598 bytes |                                               687945 bytes |
| [B1.7] Insert/Delete strings at random positions (memUsed)               |                            4.4 MB |                                            163.8 MB |                                                     9.4 MB |
| [B1.7] Insert/Delete strings at random positions (parseTime)             |                             51 ms |                                             2351 ms |                                                    1648 ms |
| [B1.8] Append N numbers (time)                                           |                            330 ms |                                             2913 ms |                                                   10309 ms |
| [B1.8] Append N numbers (avgUpdateSize)                                  |                          32 bytes |                                           333 bytes |                                                   48 bytes |
| [B1.8] Append N numbers (docSize)                                        |                       35634 bytes |                                       2200659 bytes |                                               204029 bytes |
| [B1.8] Append N numbers (memUsed)                                        |                               0 B |                                             73.6 MB |                                                     1.9 MB |
| [B1.8] Append N numbers (parseTime)                                      |                             19 ms |                                              671 ms |                                                      42 ms |
| [B1.9] Insert Array of N numbers (time)                                  |                             14 ms |                                             3223 ms |                                                   10157 ms |
| [B1.9] Insert Array of N numbers (avgUpdateSize)                         |                       35661 bytes |                                       1523693 bytes |                                                   48 bytes |
| [B1.9] Insert Array of N numbers (docSize)                               |                       35661 bytes |                                       1608026 bytes |                                               204031 bytes |
| [B1.9] Insert Array of N numbers (memUsed)                               |                               0 B |                                             53.3 MB |                                                     2.1 MB |
| [B1.9] Insert Array of N numbers (parseTime)                             |                             20 ms |                                              613 ms |                                                      39 ms |
| [B1.10] Prepend N numbers (time)                                         |                            271 ms |                                            62982 ms |                                                    9121 ms |
| [B1.10] Prepend N numbers (avgUpdateSize)                                |                          32 bytes |                                           297 bytes |                                                   40 bytes |
| [B1.10] Prepend N numbers (docSize)                                      |                       35669 bytes |                                       1985894 bytes |                                               204031 bytes |
| [B1.10] Prepend N numbers (memUsed)                                      |                            7.1 MB |                                             67.3 MB |                                                     1.9 MB |
| [B1.10] Prepend N numbers (parseTime)                                    |                             49 ms |                                            60077 ms |                                                     933 ms |
| [B1.11] Insert N numbers at random positions (time)                      |                            296 ms |                                             3844 ms |                                                    9892 ms |
| [B1.11] Insert N numbers at random positions (avgUpdateSize)             |                          34 bytes |                                           332 bytes |                                                   48 bytes |
| [B1.11] Insert N numbers at random positions (docSize)                   |                       59161 bytes |                                       2198120 bytes |                                               204029 bytes |
| [B1.11] Insert N numbers at random positions (memUsed)                   |                            7.5 MB |                                             70.1 MB |                                                     1.9 MB |
| [B1.11] Insert N numbers at random positions (parseTime)                 |                             51 ms |                                             1116 ms |                                                     682 ms |
| [B2.1] Concurrently insert string of length N at index 0 (time)          |                              3 ms |                                             5729 ms |                                                   39820 ms |
| [B2.1] Concurrently insert string of length N at index 0 (updateSize)    |                       12058 bytes |                                       2970726 bytes |                                               551984 bytes |
| [B2.1] Concurrently insert string of length N at index 0 (docSize)       |                       12149 bytes |                                       3164619 bytes |                                               375131 bytes |
| [B2.1] Concurrently insert string of length N at index 0 (memUsed)       |                               0 B |                                            107.8 MB |                                                     5.1 MB |
| [B2.1] Concurrently insert string of length N at index 0 (parseTime)     |                             20 ms |                                              912 ms |                                                      70 ms |
| [B2.2] Concurrently insert N characters at random positions (time)       |                            143 ms |                                            53873 ms |                                                   38517 ms |
| [B2.2] Concurrently insert N characters at random positions (updateSize) |                       66360 bytes |                                       2753229 bytes |                                               551912 bytes |
| [B2.2] Concurrently insert N characters at random positions (docSize)    |                       66454 bytes |                                       2947122 bytes |                                               375131 bytes |
| [B2.2] Concurrently insert N characters at random positions (memUsed)    |                            7.3 MB |                                             98.2 MB |                                                     5.2 MB |
| [B2.2] Concurrently insert N characters at random positions (parseTime)  |                             59 ms |                                            60674 ms |                                                    2740 ms |
| [B2.3] Concurrently insert N words at random positions (time)            |                            228 ms |                                           309114 ms |                                                 2280822 ms |
| [B2.3] Concurrently insert N words at random positions (updateSize)      |                      177753 bytes |                                      17696052 bytes |                                              3295776 bytes |
| [B2.3] Concurrently insert N words at random positions (docSize)         |                      177918 bytes |                                      18725017 bytes |                                              2224223 bytes |
| [B2.3] Concurrently insert N words at random positions (memUsed)         |                           15.3 MB |                                            619.6 MB |                                                    39.8 MB |
| [B2.3] Concurrently insert N words at random positions (parseTime)       |                             81 ms |                                           139273 ms |                                                   41511 ms |
| [B2.4] Concurrently insert & delete (time)                               |                            408 ms |                                           518020 ms |                                                 3058659 ms |
| [B2.4] Concurrently insert & delete (updateSize)                         |                      278025 bytes |                                      26580311 bytes |                                              5560784 bytes |
| [B2.4] Concurrently insert & delete (docSize)                            |                      278153 bytes |                                      28112800 bytes |                                              3607213 bytes |
| [B2.4] Concurrently insert & delete (memUsed)                            |                           19.4 MB |                                              850 MB |                                                    38.1 MB |
| [B2.4] Concurrently insert & delete (parseTime)                          |                            120 ms |                                            19810 ms |                                                   64675 ms |
| [B3.1] 20√N clients concurrently set number in Map (time)                |                            551 ms |                                             7643 ms |                                                            |
| [B3.1] 20√N clients concurrently set number in Map (updateSize)          |                       49168 bytes |                                        246830 bytes |                                                            |
| [B3.1] 20√N clients concurrently set number in Map (docSize)             |                       32213 bytes |                                        288422 bytes |                                                            |
| [B3.1] 20√N clients concurrently set number in Map (memUsed)             |                            3.6 MB |                                             30.9 MB |                                                            |
| [B3.1] 20√N clients concurrently set number in Map (parseTime)           |                             54 ms |                                             6067 ms |                                                            |
| [B3.2] 20√N clients concurrently set Object in Map (time)                |                            711 ms |                                            39655 ms |                                                            |
| [B3.2] 20√N clients concurrently set Object in Map (updateSize)          |                       95864 bytes |                                        684190 bytes |                                                            |
| [B3.2] 20√N clients concurrently set Object in Map (docSize)             |                       41477 bytes |                                        758122 bytes |                                                            |
| [B3.2] 20√N clients concurrently set Object in Map (memUsed)             |                              7 MB |                                             64.9 MB |                                                            |
| [B3.2] 20√N clients concurrently set Object in Map (parseTime)           |                             54 ms |                                            14129 ms |                                                            |
| [B3.3] 20√N clients concurrently set String in Map (time)                |                            790 ms |                                             9342 ms |                                                            |
| [B3.3] 20√N clients concurrently set String in Map (updateSize)          |                     7826229 bytes |                                       8021860 bytes |                                                            |
| [B3.3] 20√N clients concurrently set String in Map (docSize)             |                       38360 bytes |                                       8063452 bytes |                                                            |
| [B3.3] 20√N clients concurrently set String in Map (memUsed)             |                           13.1 MB |                                             77.9 MB |                                                            |
| [B3.3] 20√N clients concurrently set String in Map (parseTime)           |                             49 ms |                                             7670 ms |                                                            |
| [B3.4] 20√N clients concurrently insert text in Array (time)             |                            596 ms |                                            21964 ms |                                                    2063 ms |
| [B3.4] 20√N clients concurrently insert text in Array (updateSize)       |                       52746 bytes |                                        499350 bytes |                                                65810 bytes |
| [B3.4] 20√N clients concurrently insert text in Array (docSize)          |                       26591 bytes |                                        552023 bytes |                                                57757 bytes |
| [B3.4] 20√N clients concurrently insert text in Array (memUsed)          |                            6.8 MB |                                             59.5 MB |                                                     4.4 MB |
| [B3.4] 20√N clients concurrently insert text in Array (parseTime)        |                             32 ms |                                            44967 ms |                                                    2078 ms |
| [B4] Apply real-world editing dataset (time)                             |                           6342 ms |                                           489104 ms |                                                20134540 ms |
| [B4] Apply real-world editing dataset (avgUpdateSize)                    |                          29 bytes |                                           291 bytes |                                                   45 bytes |
| [B4] Apply real-world editing dataset (encodeTime)                       |                             27 ms |                                             2611 ms |                                                     814 ms |
| [B4] Apply real-world editing dataset (docSize)                          |                      159929 bytes |                                      83966886 bytes |                                              7888799 bytes |
| [B4] Apply real-world editing dataset (memUsed)                          |                            3.2 MB |                                              1.1 GB |                                                    34.4 MB |
| [B4] Apply real-world editing dataset (parseTime)                        |                             86 ms |                                            37844 ms |                                                   51991 ms |
| [B4 x 100] Apply real-world editing dataset 100 times (time)             |                         170254 ms |                                                     |                                                            |
| [B4 x 100] Apply real-world editing dataset 100 times (encodeTime)       |                            645 ms |                                                     |                                                            |
| [B4 x 100] Apply real-world editing dataset 100 times (docSize)          |                    15989245 bytes |                                                     |                                                            |
| [B4 x 100] Apply real-world editing dataset 100 times (parseTime)        |                           1792 ms |                                                     |                                                            |
| [B4 x 100] Apply real-world editing dataset 100 times (memUsed)          |                          266.4 MB |                                                     |                                                            |

| N = 60000                                                                |            Yjs |    automerge |
| :----------------------------------------------------------------------- | -------------: | -----------: |
| Bundle size                                                              |    65939 bytes | 259763 bytes |
| Bundle size (gzipped)                                                    |    19383 bytes |  61478 bytes |
| [B1.1] Append N characters (time)                                        |        1582 ms |              |
| [B1.1] Append N characters (avgUpdateSize)                               |       29 bytes |              |
| [B1.1] Append N characters (docSize)                                     |    60034 bytes |              |
| [B1.1] Append N characters (parseTime)                                   |           1 ms |              |
| [B1.1] Append N characters (memUsed)                                     |        16.3 MB |              |
| [B1.1] Append N characters                                               |                |     skipping |
| [B1.2] Insert string of length N (time)                                  |           8 ms |              |
| [B1.2] Insert string of length N (avgUpdateSize)                         |    60034 bytes |              |
| [B1.2] Insert string of length N (docSize)                               |    60034 bytes |              |
| [B1.2] Insert string of length N (parseTime)                             |           1 ms |              |
| [B1.2] Insert string of length N (memUsed)                               |         1.8 MB |              |
| [B1.2] Insert string of length N                                         |                |     skipping |
| [B1.3] Prepend N characters (time)                                       |        1229 ms |              |
| [B1.3] Prepend N characters (avgUpdateSize)                              |       29 bytes |              |
| [B1.3] Prepend N characters (docSize)                                    |    60047 bytes |              |
| [B1.3] Prepend N characters (parseTime)                                  |          45 ms |              |
| [B1.3] Prepend N characters (memUsed)                                    |        35.2 MB |              |
| [B1.3] Prepend N characters                                              |                |     skipping |
| [B1.4] Insert N characters at random positions (time)                    |        1801 ms |              |
| [B1.4] Insert N characters at random positions (avgUpdateSize)           |       31 bytes |              |
| [B1.4] Insert N characters at random positions (docSize)                 |   374543 bytes |              |
| [B1.4] Insert N characters at random positions (parseTime)               |          53 ms |              |
| [B1.4] Insert N characters at random positions (memUsed)                 |        48.9 MB |              |
| [B1.4] Insert N characters at random positions                           |                |     skipping |
| [B1.5] Insert N words at random positions (time)                         |        5711 ms |              |
| [B1.5] Insert N words at random positions (avgUpdateSize)                |       36 bytes |              |
| [B1.5] Insert N words at random positions (docSize)                      |   932585 bytes |              |
| [B1.5] Insert N words at random positions (parseTime)                    |         205 ms |              |
| [B1.5] Insert N words at random positions (memUsed)                      |        51.2 MB |              |
| [B1.5] Insert N words at random positions                                |                |     skipping |
| [B1.6] Insert string, then delete it (time)                              |           7 ms |              |
| [B1.6] Insert string, then delete it (avgUpdateSize)                     |    60057 bytes |              |
| [B1.6] Insert string, then delete it (docSize)                           |       40 bytes |              |
| [B1.6] Insert string, then delete it (parseTime)                         |           0 ms |              |
| [B1.6] Insert string, then delete it (memUsed)                           |       924.7 kB |              |
| [B1.6] Insert string, then delete it                                     |                |     skipping |
| [B1.7] Insert/Delete strings at random positions (time)                  |        4771 ms |              |
| [B1.7] Insert/Delete strings at random positions (avgUpdateSize)         |       32 bytes |              |
| [B1.7] Insert/Delete strings at random positions (docSize)               |   362959 bytes |              |
| [B1.7] Insert/Delete strings at random positions (parseTime)             |          86 ms |              |
| [B1.7] Insert/Delete strings at random positions (memUsed)               |        67.7 MB |              |
| [B1.7] Insert/Delete strings at random positions                         |                |     skipping |
| [B1.8] Append N numbers (time)                                           |       15069 ms |              |
| [B1.8] Append N numbers (avgUpdateSize)                                  |       34 bytes |              |
| [B1.8] Append N numbers (docSize)                                        |   356220 bytes |              |
| [B1.8] Append N numbers (parseTime)                                      |           2 ms |              |
| [B1.8] Append N numbers (memUsed)                                        |        19.5 MB |              |
| [B1.8] Append N numbers                                                  |                |     skipping |
| [B1.9] Insert Array of N numbers (time)                                  |           6 ms |              |
| [B1.9] Insert Array of N numbers (avgUpdateSize)                         |   356278 bytes |              |
| [B1.9] Insert Array of N numbers (docSize)                               |   356278 bytes |              |
| [B1.9] Insert Array of N numbers (parseTime)                             |           2 ms |              |
| [B1.9] Insert Array of N numbers (memUsed)                               |            0 B |              |
| [B1.9] Insert Array of N numbers                                         |                |     skipping |
| [B1.10] Prepend N numbers (time)                                         |        1185 ms |              |
| [B1.10] Prepend N numbers (avgUpdateSize)                                |       34 bytes |              |
| [B1.10] Prepend N numbers (docSize)                                      |   356347 bytes |              |
| [B1.10] Prepend N numbers (parseTime)                                    |          29 ms |              |
| [B1.10] Prepend N numbers (memUsed)                                      |            0 B |              |
| [B1.10] Prepend N numbers                                                |                |     skipping |
| [B1.11] Insert N numbers at random positions (time)                      |        1901 ms |              |
| [B1.11] Insert N numbers at random positions (avgUpdateSize)             |       36 bytes |              |
| [B1.11] Insert N numbers at random positions (docSize)                   |   670910 bytes |              |
| [B1.11] Insert N numbers at random positions (parseTime)                 |          52 ms |              |
| [B1.11] Insert N numbers at random positions (memUsed)                   |        84.5 MB |              |
| [B1.11] Insert N numbers at random positions                             |                |     skipping |
| [B2.1] Concurrently insert string of length N at index 0 (time)          |           5 ms |              |
| [B2.1] Concurrently insert string of length N at index 0 (updateSize)    |   120064 bytes |              |
| [B2.1] Concurrently insert string of length N at index 0 (docSize)       |   120154 bytes |              |
| [B2.1] Concurrently insert string of length N at index 0 (parseTime)     |           2 ms |              |
| [B2.1] Concurrently insert string of length N at index 0 (memUsed)       |         4.2 MB |              |
| [B2.1] Concurrently insert string of length N at index 0                 |                |     skipping |
| [B2.2] Concurrently insert N characters at random positions (time)       |        1017 ms |              |
| [B2.2] Concurrently insert N characters at random positions (updateSize) |   760850 bytes |              |
| [B2.2] Concurrently insert N characters at random positions (docSize)    |   760942 bytes |              |
| [B2.2] Concurrently insert N characters at random positions (parseTime)  |          91 ms |              |
| [B2.2] Concurrently insert N characters at random positions (memUsed)    |            0 B |              |
| [B2.2] Concurrently insert N characters at random positions              |                |     skipping |
| [B2.3] Concurrently insert N words at random positions (time)            |        9163 ms |              |
| [B2.3] Concurrently insert N words at random positions (updateSize)      |  1877355 bytes |              |
| [B2.3] Concurrently insert N words at random positions (docSize)         |  1877486 bytes |              |
| [B2.3] Concurrently insert N words at random positions (parseTime)       |         344 ms |              |
| [B2.3] Concurrently insert N words at random positions (memUsed)         |            0 B |              |
| [B2.3] Concurrently insert N words at random positions                   |                |     skipping |
| [B2.4] Concurrently insert & delete (time)                               |       18214 ms |              |
| [B2.4] Concurrently insert & delete (updateSize)                         |  2883749 bytes |              |
| [B2.4] Concurrently insert & delete (docSize)                            |  2883876 bytes |              |
| [B2.4] Concurrently insert & delete (parseTime)                          |         661 ms |              |
| [B2.4] Concurrently insert & delete (memUsed)                            |       258.2 MB |              |
| [B2.4] Concurrently insert & delete                                      |                |     skipping |
| [B3.1] √N clients concurrently set number in Map (time)                  |          20 ms |              |
| [B3.1] √N clients concurrently set number in Map (updateSize)            |     7736 bytes |              |
| [B3.1] √N clients concurrently set number in Map (docSize)               |     5121 bytes |              |
| [B3.1] √N clients concurrently set number in Map (parseTime)             |           3 ms |              |
| [B3.1] √N clients concurrently set number in Map (memUsed)               |            0 B |              |
| [B3.1] √N clients concurrently set number in Map                         |                |     skipping |
| [B3.2] √N clients concurrently set Object in Map (time)                  |          29 ms |              |
| [B3.2] √N clients concurrently set Object in Map (updateSize)            |    15011 bytes |              |
| [B3.2] √N clients concurrently set Object in Map (docSize)               |     6612 bytes |              |
| [B3.2] √N clients concurrently set Object in Map (parseTime)             |           2 ms |              |
| [B3.2] √N clients concurrently set Object in Map (memUsed)               |         6.6 MB |              |
| [B3.2] √N clients concurrently set Object in Map                         |                |     skipping |
| [B3.3] √N clients concurrently set String in Map (time)                  |          24 ms |              |
| [B3.3] √N clients concurrently set String in Map (updateSize)            |   159565 bytes |              |
| [B3.3] √N clients concurrently set String in Map (docSize)               |     5601 bytes |              |
| [B3.3] √N clients concurrently set String in Map (parseTime)             |           3 ms |              |
| [B3.3] √N clients concurrently set String in Map (memUsed)               |         6.4 MB |              |
| [B3.3] √N clients concurrently set String in Map                         |                |     skipping |
| [B3.4] √N clients concurrently insert text in Array (time)               |          20 ms |              |
| [B3.4] √N clients concurrently insert text in Array (updateSize)         |     8185 bytes |              |
| [B3.4] √N clients concurrently insert text in Array (docSize)            |     4062 bytes |              |
| [B3.4] √N clients concurrently insert text in Array (parseTime)          |           0 ms |              |
| [B3.4] √N clients concurrently insert text in Array (memUsed)            |            0 B |              |
| [B3.4] √N clients concurrently insert text in Array                      |                |     skipping |
| [B4] Apply real-world editing dataset (time)                             |        5238 ms |              |
| [B4] Apply real-world editing dataset (updateSize)                       |  7306126 bytes |              |
| [B4] Apply real-world editing dataset (encodeTime)                       |          13 ms |              |
| [B4] Apply real-world editing dataset (docSize)                          |   159927 bytes |              |
| [B4] Apply real-world editing dataset (parseTime)                        |          16 ms |              |
| [B4] Apply real-world editing dataset (memUsed)                          |         6.9 MB |              |
| [B4] Apply real-world editing dataset                                    |                |     skipping |
| [B4 x 100] Apply real-world editing dataset 100 times (time)             |      198383 ms |              |
| [B4 x 100] Apply real-world editing dataset 100 times (encodeTime)       |         617 ms |              |
| [B4 x 100] Apply real-world editing dataset 100 times (docSize)          | 15989245 bytes |              |
| [B4 x 100] Apply real-world editing dataset 100 times (parseTime)        |        2127 ms |              |
| [B4 x 100] Apply real-world editing dataset 100 times (memUsed)          |       165.5 MB |              |

## Development

Modify the `N` variable in `benchmarks/utils.js` to increase the difficulty.

## License

[The MIT License](./LICENSE) © Kevin Jahns

Except for /b4-editing-trace.js © Martin Kleppmann
