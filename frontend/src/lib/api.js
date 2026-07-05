import { toast } from './toast.js'

// 백엔드 호출 헬퍼 — 기존 ABC.api 와 동일 규약. GET: api(path) / POST: api(path, body).
export async function api(path, body) {
  const options = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' }
  try {
    const res = await fetch(path, options)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    toast('서버 연결에 실패했습니다')
    throw e
  }
}

// 프로젝트 삭제 등은 기존 코드가 fetch 를 직접 썼다 — 동일하게 DELETE 편의 제공.
export function del(path) {
  return fetch(path, { method: 'DELETE' })
}
