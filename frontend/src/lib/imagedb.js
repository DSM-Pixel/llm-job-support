// 라벨링 업로드 이미지를 IndexedDB 에 저장 — 페이지 이동/새로고침 후에도 유지.
// 브라우저 메모리의 File(blob)·objectURL 은 페이지가 바뀌면 사라지므로, 원본 blob 과
// 저장 박스를 프로젝트별로 여기에 담아 복귀 시 복원한다. (localStorage 는 용량이 작아 부적합.)
//
//   store: labeling_images { key: `${project}::${name}`, project, name, blob, savedBoxes, ts }
//
// IndexedDB 를 못 쓰는 환경(사생활 보호 모드 등)에서는 모든 함수가 조용히 실패한다.
const DB_NAME = 'gnsoft'
const STORE = 'labeling_images'
const VERSION = 1

const keyOf = (project, name) => `${project || 'none'}::${name}`

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'))
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'key' })
        os.createIndex('project', 'project', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// 이미지 원본 저장(같은 project+name 은 덮어씀).
export async function putImage(project, name, blob, savedBoxes = []) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      t.objectStore(STORE).put({
        key: keyOf(project, name),
        project: project || 'none',
        name,
        blob,
        savedBoxes,
        ts: Date.now(),
      })
      t.oncomplete = resolve
      t.onerror = () => reject(t.error)
    })
    db.close()
  } catch {
    /* IndexedDB 불가/용량초과 — 유지가 안 될 뿐 기능은 계속 동작 */
  }
}

// 저장 박스만 갱신(원본 유지).
export async function updateBoxes(project, name, savedBoxes) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      const store = t.objectStore(STORE)
      const g = store.get(keyOf(project, name))
      g.onsuccess = () => {
        const rec = g.result
        if (rec) {
          rec.savedBoxes = savedBoxes
          rec.ts = Date.now()
          store.put(rec)
        }
      }
      t.oncomplete = resolve
      t.onerror = () => reject(t.error)
    })
    db.close()
  } catch {
    /* 무시 */
  }
}

// 분석 결과(설명 분석)만 갱신(원본 유지).
export async function updateResult(project, name, result) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      const store = t.objectStore(STORE)
      const g = store.get(keyOf(project, name))
      g.onsuccess = () => {
        const rec = g.result
        if (rec) {
          rec.result = result
          rec.ts = Date.now()
          store.put(rec)
        }
      }
      t.oncomplete = resolve
      t.onerror = () => reject(t.error)
    })
    db.close()
  } catch {
    /* 무시 */
  }
}

export async function deleteImage(project, name) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      t.objectStore(STORE).delete(keyOf(project, name))
      t.oncomplete = resolve
      t.onerror = () => reject(t.error)
    })
    db.close()
  } catch {
    /* 무시 */
  }
}

// 프로젝트의 저장 이미지 전부(추가순).
export async function allImages(project) {
  try {
    const db = await openDb()
    const rows = await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly')
      const req = t.objectStore(STORE).index('project').getAll(project || 'none')
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return rows.sort((a, b) => (a.ts || 0) - (b.ts || 0))
  } catch {
    return []
  }
}
