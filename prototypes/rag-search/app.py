"""하이브리드 RAG 지식검색 데모 (Gemini 무료 티어).

데모 시나리오: "도로 점검 문서를 넣고 '포트홀 보수 기준이 뭐야?' 하면
근거 문서를 찾아 출처와 함께 답해준다."

흐름:
    문서(샘플 + 업로드) → 청킹 → Gemini 임베딩(의미검색) + BM25(키워드검색)
      → 질문 → 하이브리드 검색(RRF로 융합) → 상위 근거 → Gemini가 출처 있는 답변

설계 메모(바이브 코딩):
    - 무거운 벡터DB 없이 numpy 코사인 + rank_bm25 로 얇게 시작한다.
    - 규모가 커지면 ChromaDB/FAISS 로 갈아끼우면 된다.

실행:
    python prototypes/rag-search/app.py
"""

import json
import os
import re
import time

import gradio as gr
import numpy as np
import requests
import trafilatura
from ddgs import DDGS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from rank_bm25 import BM25Okapi

_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(here, "..", "api-test", ".env"))
load_dotenv(os.path.join(here, ".env"))
load_dotenv()

# 모델명은 .env(GEMINI_MODEL / GEMINI_EMBED_MODEL)로 바꿀 수 있다(이미지 앱과 통일).
GEN_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
TOP_K = 4  # 답변에 넣을 최종 근거 청크 수
RERANK_POOL = 8  # 리랭킹 전에 하이브리드 검색으로 모으는 후보 수

_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=_api_key) if _api_key else None
SAMPLE_DIR = os.path.join(here, "sample_docs")


# ---------- 문서 읽기 / 청킹 ----------

def _read_file(path: str) -> str:
    """txt/md 는 그대로, pdf 는 텍스트 추출."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(path)
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception:
            return ""
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, encoding="cp949", errors="ignore") as f:
            return f.read()


def _chunk(text: str, size: int = 400, overlap: int = 60):
    """문단 경계를 살리며 size 글자 내외로 자른다(겹침 약간)."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, buf = [], ""
    for p in paras:
        if len(buf) + len(p) + 1 <= size:
            buf = f"{buf}\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
            # 직전 청크 끝부분을 겹쳐 문맥 유지.
            buf = (buf[-overlap:] + "\n" + p) if buf else p
            while len(buf) > size:
                chunks.append(buf[:size])
                buf = buf[size - overlap :]
    if buf:
        chunks.append(buf)
    return chunks


def _tokenize(text: str):
    """BM25용 간이 토크나이저. 한글은 단어 + 2-그램으로 보강해 재현율을 높인다."""
    words = re.findall(r"[0-9a-zA-Z]+|[가-힣]+", text.lower())
    tokens = []
    for w in words:
        tokens.append(w)
        if len(w) >= 2 and re.match(r"[가-힣]+", w):
            tokens += [w[i : i + 2] for i in range(len(w) - 1)]
    return tokens


def _embed(texts, task_type: str):
    """텍스트 묶음을 임베딩(배치)하여 numpy 행렬로 반환. 429는 한 번 대기 후 재시도."""
    vecs = []
    for i in range(0, len(texts), 20):  # 분당 한도 회피를 위해 작게 배치.
        batch = texts[i : i + 20]
        for attempt in range(2):
            try:
                resp = client.models.embed_content(
                    model=EMBED_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(task_type=task_type),
                )
                break
            except Exception as e:
                if attempt == 0 and ("RESOURCE_EXHAUSTED" in str(e) or "429" in str(e)):
                    time.sleep(20)  # 분당 한도면 잠깐 쉬면 풀린다.
                    continue
                raise
        vecs.extend(e.values for e in resp.embeddings)
    arr = np.array(vecs, dtype="float32")
    # 코사인 유사도를 내적으로 계산하도록 정규화.
    arr /= np.linalg.norm(arr, axis=1, keepdims=True) + 1e-8
    return arr


# ---------- 인덱싱 ----------

def _index_status(index) -> str:
    n_src = len({c["source"] for c in index["chunks"]})
    return f"✅ 색인됨 — 문서/소스 {n_src}개 · 청크 {len(index['chunks'])}개. 이제 질문하세요."


def _append_chunks(index, new_chunks):
    """새 청크만 임베딩해 기존 인덱스에 합치고 BM25를 다시 만든다(기존 벡터 재사용)."""
    try:
        new_vecs = _embed([c["text"] for c in new_chunks], "RETRIEVAL_DOCUMENT")
    except Exception as e:
        if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
            raise gr.Error("무료 사용 한도 초과 — 잠시 후 다시 시도하세요.") from e
        raise gr.Error(f"임베딩 오류: {e}") from e

    if index:
        chunks = index["chunks"] + new_chunks
        vectors = np.vstack([index["vectors"], new_vecs])
    else:
        chunks, vectors = new_chunks, new_vecs

    bm25 = BM25Okapi([_tokenize(c["text"]) for c in chunks])
    return {"chunks": chunks, "vectors": vectors, "bm25": bm25}


def _carry_over_web(file_index, old_index):
    """파일/샘플로 새로 만든 인덱스에, 기존 인덱스의 웹 자료(🌐)를 그대로 보존해 합친다."""
    if not old_index:
        return file_index
    web_chunks, web_rows = [], []
    for chunk, vec in zip(old_index["chunks"], old_index["vectors"]):
        if chunk["source"].startswith("web:"):
            web_chunks.append(chunk)
            web_rows.append(vec)
    if not web_chunks:
        return file_index
    chunks = file_index["chunks"] + web_chunks
    vectors = np.vstack([file_index["vectors"], np.array(web_rows, dtype="float32")])
    bm25 = BM25Okapi([_tokenize(c["text"]) for c in chunks])
    return {"chunks": chunks, "vectors": vectors, "bm25": bm25}


def build_index(files, use_samples: bool, index):
    """샘플 + 업로드 문서를 다시 색인한다. 기존에 가져온 웹 자료(🌐)는 보존한다."""
    if client is None:
        raise gr.Error("GEMINI_API_KEY 가 없습니다. api-test/.env 를 확인하세요.")

    paths = []
    if use_samples and os.path.isdir(SAMPLE_DIR):
        paths += [os.path.join(SAMPLE_DIR, f) for f in sorted(os.listdir(SAMPLE_DIR))]
    if files:
        paths += [f.name for f in files]
    if not paths:
        raise gr.Error("문서가 없습니다. 샘플 사용을 켜거나 파일을 업로드하세요.")

    chunks = []
    for path in paths:
        text = _read_file(path)
        src = os.path.basename(path)
        for c in _chunk(text):
            chunks.append({"text": c, "source": src})
    if not chunks:
        raise gr.Error("문서에서 텍스트를 추출하지 못했습니다.")

    file_index = _append_chunks(None, chunks)  # 파일/샘플 부분만 새로 임베딩
    new_index = _carry_over_web(file_index, index)  # 기존 웹 자료 보존
    return new_index, _index_status(new_index)


def reset_index():
    """모든 색인 자료를 비운다(파일·웹 전부)."""
    return None, "🗑 전체 초기화됨 — 다시 색인하거나 웹 자료를 가져오세요."


# ---------- 웹 검색 → 가져오기 ----------

def web_search(keyword: str):
    """DuckDuckGo로 실제 웹을 검색해 결과 목록을 체크박스로 보여준다."""
    keyword = (keyword or "").strip()
    if not keyword:
        raise gr.Error("검색어를 입력해주세요.")
    try:
        results = DDGS().text(keyword, region="kr-kr", max_results=10)
    except Exception as e:
        raise gr.Error(f"검색 실패: {e}") from e
    if not results:
        return gr.update(choices=[], value=[]), "검색 결과가 없습니다. 다른 검색어를 써보세요."

    # (보여줄 라벨, 내부값=URL) 형태로 체크박스 구성.
    choices = []
    for r in results:
        title = (r.get("title") or "(제목 없음)").strip()
        url = r.get("href") or ""
        choices.append((f"{title[:70]}  —  {url[:45]}", url))
    return gr.update(choices=choices, value=[]), f"🔎 {len(choices)}개 검색됨. 가져올 자료를 선택하세요."


def _extract_url(url: str) -> str:
    """선택한 URL의 본문 텍스트를 추출(trafilatura → requests+BS4 폴백)."""
    try:
        dl = trafilatura.fetch_url(url)
        if dl:
            t = trafilatura.extract(dl)
            if t and len(t) > 100:
                return t
    except Exception:
        pass
    try:
        html = requests.get(url, headers=_UA, timeout=15).text
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.extract()
        return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n")).strip()
    except Exception:
        return ""


def add_web_sources(index, selected_urls, progress=gr.Progress()):
    """선택한 웹 자료를 가져와 본문을 추출하고 인덱스에 추가한다(중복 스킵 + 진행 표시)."""
    if client is None:
        raise gr.Error("GEMINI_API_KEY 가 없습니다.")
    if not selected_urls:
        raise gr.Error("가져올 자료를 하나 이상 선택해주세요.")

    existing = {c["source"] for c in index["chunks"]} if index else set()
    new_chunks, ok, fail, dup = [], [], [], []
    total = len(selected_urls)
    for i, url in enumerate(selected_urls):
        progress(i / total, desc=f"가져오는 중… ({i + 1}/{total})")
        if f"web:{url}" in existing:  # 이미 색인된 자료는 건너뛴다.
            dup.append(url)
            continue
        text = _extract_url(url)
        if len(text) < 100:  # 추출 실패/내용 부족.
            fail.append(url)
            continue
        text = text[:6000]  # 긴 페이지는 앞부분만(임베딩 분당 한도 보호).
        src = f"web:{url}"
        for c in _chunk(text):
            new_chunks.append({"text": c, "source": src})
        ok.append(url)

    if not new_chunks:
        if dup and not fail:
            raise gr.Error("선택한 자료는 이미 모두 색인돼 있습니다.")
        raise gr.Error("선택한 자료에서 본문을 가져오지 못했습니다(JS·차단 페이지일 수 있어요). 다른 결과를 선택해보세요.")

    progress(0.9, desc="임베딩 중…")
    index = _append_chunks(index, new_chunks)
    msg = f"➕ 웹 자료 {len(ok)}개 가져옴 · 청크 {len(new_chunks)}개 추가.\n" + _index_status(index)
    if dup:
        msg += f"\nℹ️ {len(dup)}개는 이미 있어 건너뜀."
    if fail:
        msg += f"\n⚠️ {len(fail)}개는 본문 추출 실패(건너뜀)."
    return index, msg


# ---------- 검색(하이브리드) + 답변 ----------

def _hybrid_search(index, query: str, k: int = TOP_K):
    """의미검색 + BM25 결과를 RRF(역순위 융합)로 합쳐 상위 k개를 고른다."""
    chunks = index["chunks"]

    qv = _embed([query], "RETRIEVAL_QUERY")[0]
    dense_scores = index["vectors"] @ qv  # 코사인 유사도
    dense_rank = np.argsort(-dense_scores)

    bm25_scores = index["bm25"].get_scores(_tokenize(query))
    bm25_rank = np.argsort(-bm25_scores)

    # Reciprocal Rank Fusion: 점수 스케일이 달라도 안전하게 융합.
    rrf, c = {}, 60
    for rank, idx in enumerate(dense_rank):
        rrf[idx] = rrf.get(idx, 0) + 1 / (c + rank)
    for rank, idx in enumerate(bm25_rank):
        rrf[idx] = rrf.get(idx, 0) + 1 / (c + rank)

    top = sorted(rrf, key=lambda i: -rrf[i])[:k]
    return [chunks[i] for i in top]


def _retrieval_query(prev_history, message: str) -> str:
    """후속 질문 대응: 직전 사용자 발화를 합쳐 검색 쿼리를 보강한다."""
    prev_users = [m["content"] for m in (prev_history or []) if m.get("role") == "user"]
    return " ".join(prev_users[-1:] + [message]).strip()


def _rerank(query: str, candidates):
    """하이브리드 후보를 LLM이 0~100 관련도로 재채점해 정렬한다. 실패 시 원순서 유지."""
    if not candidates:
        return []
    listing = "\n\n".join(f"[{i}] {c['text'][:500]}" for i, c in enumerate(candidates))
    prompt = (
        f"질문: {query}\n\n"
        "아래 각 후보 근거가 이 질문에 답하는 데 얼마나 관련 있는지 0~100점으로 평가해. "
        '형식: JSON 배열 [{"index": <번호>, "score": <0-100>}], 모든 후보 포함.\n\n'
        f"{listing}"
    )
    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {"index": {"type": "INTEGER"}, "score": {"type": "INTEGER"}},
            "required": ["index", "score"],
        },
    }
    try:
        resp = client.models.generate_content(
            model=GEN_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json", response_schema=schema, temperature=0
            ),
        )
        scored = []
        for item in json.loads(resp.text):
            i = item.get("index")
            if isinstance(i, int) and 0 <= i < len(candidates):
                scored.append((candidates[i], int(item.get("score", 0))))
        if scored:
            scored.sort(key=lambda x: -x[1])
            return scored
    except Exception:
        pass
    return [(c, None) for c in candidates]  # 폴백: 하이브리드 순서, 점수 없음


def _matched_keywords(query: str, text: str):
    """질문 토큰 중 근거에 실제로 등장하는 키워드(2글자+)를 표시용으로 추린다."""
    qtokens = {t for t in _tokenize(query) if len(t) >= 2}
    low = text.lower()
    hits = sorted({t for t in qtokens if t in low}, key=len, reverse=True)
    return hits[:5]


def _source_link(src: str) -> str:
    """웹 소스는 클릭 가능한 링크, 파일은 코드 표기."""
    if src.startswith("web:"):
        url = src[4:]
        host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
        return f"[🌐 {host}]({url})"
    return f"📄 `{src}`"


def _format_sources(scored_hits, query: str) -> str:
    """검색 근거를 관련도 점수 · 클릭 출처 · 매칭 키워드와 함께 마크다운으로."""
    lines = ["### 🔎 검색된 근거 (관련도순)"]
    for i, (h, score) in enumerate(scored_hits):
        kw = _matched_keywords(query, h["text"])
        kw_md = " · ".join(f"`{k}`" for k in kw) if kw else "—"
        score_md = f"관련도 **{score}**" if score is not None else "관련도 —"
        snippet = h["text"][:200].replace("\n", " ")
        lines.append(
            f"**[근거 {i + 1}]** {score_md} · 출처 {_source_link(h['source'])}\n"
            f"매칭 키워드: {kw_md}\n> {snippet}…"
        )
    return "\n\n".join(lines)


def respond(index, message: str, history):
    """대화형 + 스트리밍 RAG. 하이브리드 검색 → LLM 리랭킹 → 맥락 반영 스트리밍 답변."""
    if client is None:
        raise gr.Error("GEMINI_API_KEY 가 없습니다.")
    if not index:
        raise gr.Error("먼저 '문서 색인하기'를 눌러주세요.")
    message = (message or "").strip()
    if not message:
        raise gr.Error("질문을 입력해주세요.")

    prev_history = list(history or [])
    history = prev_history + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": "🔎 근거 검색·정렬 중…"},
    ]
    yield history, "", gr.update()

    # 1) 하이브리드로 후보 풀 검색 → 2) LLM 리랭킹으로 상위 K 선별.
    try:
        query = _retrieval_query(prev_history, message)  # 직전 맥락 포함(후속 질문 대응)
        candidates = _hybrid_search(index, query, k=RERANK_POOL)
        scored = _rerank(message, candidates)[:TOP_K]
    except Exception as e:
        if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
            history[-1]["content"] = "⚠️ 무료 사용 한도 초과 — 잠시 후 다시 시도하세요."
            yield history, "", gr.update()
            return
        raise gr.Error(f"검색 오류: {e}") from e

    hits = [h for h, _ in scored]
    sources_md = _format_sources(scored, message)

    # 3) 이전 대화 맥락 + 근거로 프롬프트 구성.
    context = "\n\n".join(
        f"[근거 {i + 1}] (출처: {h['source']})\n{h['text']}" for i, h in enumerate(hits)
    )
    convo = "\n".join(
        f"{'사용자' if m['role'] == 'user' else '도우미'}: {m['content']}"
        for m in prev_history[-4:]
    )
    prompt = (
        "너는 도로·시설물 점검 지식 도우미야. 아래 [근거]만 사용해 한국어로 답해. "
        "근거에 없으면 지어내지 말고 '제공된 문서에서 찾을 수 없습니다'라고 말해. "
        "이전 대화 맥락이 있으면 자연스럽게 이어서 답하고, "
        "답변 끝에 사용한 근거 번호를 (근거 1, 3) 형식으로 표기해.\n\n"
        + (f"[이전 대화]\n{convo}\n\n" if convo else "")
        + f"{context}\n\n질문: {message}\n답변:"
    )

    # 4) 스트리밍 출력.
    history[-1]["content"] = ""
    try:
        for ch in client.models.generate_content_stream(
            model=GEN_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        ):
            if ch.text:
                history[-1]["content"] += ch.text
                yield history, "", sources_md
    except Exception as e:
        if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
            history[-1]["content"] = "⚠️ 무료 사용 한도 초과 — 잠시 후 다시 시도하세요."
        else:
            history[-1]["content"] = f"⚠️ 생성 오류: {e}"
        yield history, "", sources_md


# ---------- 참고 파일 목록 / 추천 질문 ----------

def _pretty_src(src: str) -> str:
    """소스 이름을 보기 좋게(웹은 🌐 URL, 파일은 📄 파일명)."""
    if src.startswith("web:"):
        return f"🌐 {src[4:]}"
    return f"📄 {src}"


def _suggest_questions(index):
    """현재 색인된 자료를 바탕으로 답할 수 있는 추천 질문 4개를 생성."""
    fallback = ["이 자료의 핵심 내용은?", "주요 기준이나 수치는 뭐야?",
                "어떤 절차를 따라야 해?", "주의할 점은 뭐가 있어?"]
    # 소스별로 하나씩 골라 다양하게 발췌(토큰 절약).
    by_src = {}
    for c in index["chunks"]:
        by_src.setdefault(c["source"], c["text"])
    context = "\n---\n".join(t[:300] for t in list(by_src.values())[:6])
    prompt = (
        "다음은 지식베이스의 일부 발췌야. 이 자료만으로 답할 수 있는 "
        "한국어 질문 4개를 짧고 구체적으로 만들어 JSON 문자열 배열로만 답해.\n\n" + context
    )
    try:
        resp = client.models.generate_content(
            model=GEN_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={"type": "ARRAY", "items": {"type": "STRING"}},
                temperature=0.4,
            ),
        )
        qs = [q for q in json.loads(resp.text) if isinstance(q, str) and q.strip()]
        return qs[:4] or fallback
    except Exception:
        return fallback  # 429 등 실패 시 기본 질문.


def refresh_panel(index):
    """색인이 바뀔 때마다 '참고중인 파일'(선택 가능) 목록과 '추천 질문'을 새로 만든다."""
    if not index:
        return gr.update(choices=[], value=[]), gr.update(choices=[], value=None)
    srcs = sorted({c["source"] for c in index["chunks"]})
    # (보여줄 라벨, 내부값=원본 소스명) — 내부값으로 삭제 대상을 식별한다.
    choices = [(_pretty_src(s), s) for s in srcs]
    return gr.update(choices=choices, value=[]), gr.update(
        choices=_suggest_questions(index), value=None
    )


def delete_sources(index, selected_sources):
    """선택한 소스(파일/웹)에 속한 청크를 인덱스에서 제거한다."""
    if not index:
        raise gr.Error("색인된 자료가 없습니다.")
    if not selected_sources:
        raise gr.Error("삭제할 자료를 선택해주세요.")

    targets = set(selected_sources)
    kept = [
        (c, v)
        for c, v in zip(index["chunks"], index["vectors"])
        if c["source"] not in targets
    ]
    if not kept:  # 전부 삭제되면 빈 인덱스로 본다.
        return None, f"🗑 {len(targets)}개 자료를 삭제했습니다. 남은 자료가 없습니다."

    chunks = [c for c, _ in kept]
    vectors = np.array([v for _, v in kept], dtype="float32")
    bm25 = BM25Okapi([_tokenize(c["text"]) for c in chunks])
    index = {"chunks": chunks, "vectors": vectors, "bm25": bm25}
    return index, f"🗑 {len(targets)}개 자료 삭제됨.\n" + _index_status(index)


# ---------- UI (랜딩 페이지 GNSoft 브랜드와 통일) ----------

# 랜딩과 동일한 색/폰트 토큰을 Gradio 테마에 매핑.
THEME = gr.themes.Base(
    primary_hue=gr.themes.colors.blue,
    neutral_hue=gr.themes.colors.slate,
).set(
    body_background_fill="#F4F6FA",
    body_text_color="#0B0E17",
    block_background_fill="#FFFFFF",
    block_border_color="#E8ECF3",
    block_border_width="1px",
    block_radius="14px",
    block_shadow="0 1px 2px rgba(11,14,23,.06), 0 2px 4px rgba(11,14,23,.05)",
    block_label_text_color="#424E69",
    block_title_text_color="#0B0E17",
    button_large_radius="14px",
    button_small_radius="10px",
    button_primary_background_fill="#1B5BFF",
    button_primary_background_fill_hover="#0B45E6",
    button_primary_text_color="#FFFFFF",
    button_secondary_background_fill="#E8ECF3",
    button_secondary_background_fill_hover="#DCE1EB",
    button_secondary_text_color="#0B0E17",
    input_background_fill="#FFFFFF",
    input_border_color="#DCE1EB",
    input_border_color_focus="#1B5BFF",
    # 다크모드에서도 동일한 밝은 브랜드 룩이 되도록 dark 토큰을 light 값으로 고정.
    body_background_fill_dark="#F4F6FA",
    body_text_color_dark="#0B0E17",
    block_background_fill_dark="#FFFFFF",
    block_border_color_dark="#E8ECF3",
    block_label_text_color_dark="#424E69",
    block_title_text_color_dark="#0B0E17",
    block_info_text_color_dark="#6A7591",
    button_secondary_background_fill_dark="#E8ECF3",
    button_secondary_background_fill_hover_dark="#DCE1EB",
    button_secondary_text_color_dark="#0B0E17",
    input_background_fill_dark="#FFFFFF",
    input_border_color_dark="#DCE1EB",
    input_border_color_focus_dark="#1B5BFF",
    checkbox_background_color_dark="#FFFFFF",
    checkbox_label_background_fill_dark="#F4F6FA",
    checkbox_label_text_color_dark="#0B0E17",
)

BRAND_CSS = """
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css");
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap");
.gradio-container{max-width:1080px !important;margin:0 auto !important;background:#F4F6FA;
  font-family:"Pretendard Variable",Pretendard,-apple-system,"Malgun Gothic",system-ui,sans-serif}
/* 상단 브랜드 헤더 */
.gn-hero{background:linear-gradient(150deg,#1B5BFF,#0B45E6 62%,#0835B8);border-radius:20px;
  padding:34px 34px 30px;color:#fff;box-shadow:0 10px 30px rgba(11,69,230,.28)}
.gn-hero .gn-chip{display:inline-block;font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:.06em;
  color:#43DECB;background:rgba(67,222,203,.12);border:1px solid rgba(67,222,203,.35);
  padding:6px 11px;border-radius:99px}
.gn-hero h1{font:700 30px/1.2 "Space Grotesk","Pretendard Variable",sans-serif;letter-spacing:-.02em;
  margin:16px 0 0;color:#fff}
.gn-hero p{font-size:15px;line-height:1.6;color:rgba(255,255,255,.88);margin:10px 0 0}
.gn-hero p b{color:#fff}
.gn-hero .gn-meta{margin-top:14px;font:500 12px/1 "JetBrains Mono",monospace;color:rgba(255,255,255,.6)}
/* 섹션 소제목(마크다운 h3) 강조 */
.gn-sec h3{font:700 15px/1.3 "Pretendard Variable",sans-serif !important;color:#0B0E17;
  border-left:3px solid #1B5BFF;padding-left:10px;margin:2px 0 4px}
/* 추천 질문 라디오를 칩처럼 */
#suggest .wrap label{border-radius:99px !important;border:1px solid #DCE1EB !important;background:#fff}
footer{display:none !important}
"""

HEADER_HTML = f"""
<div class="gn-hero">
  <span class="gn-chip">◇ MULTIMODAL VISION AI</span>
  <h1>하이브리드 RAG 지식검색</h1>
  <p>공공데이터 · 내부 문서 · 웹 자료를 통합 검색하고 <b>출처와 함께</b> 답합니다.</p>
  <div class="gn-meta">임베딩 {EMBED_MODEL} · BM25 하이브리드 · 생성 {GEN_MODEL} · Free tier</div>
</div>
"""

with gr.Blocks(title="하이브리드 RAG 지식검색") as demo:
    gr.HTML(HEADER_HTML)
    index_state = gr.State()

    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### 1) 문서 준비", elem_classes=["gn-sec"])
            use_samples = gr.Checkbox(value=True, label="샘플 점검 문서 사용(도로/포트홀/시설물)")
            files = gr.File(
                label="내 문서 업로드 (txt/md/pdf, 여러 개 가능)",
                file_count="multiple",
                file_types=[".txt", ".md", ".pdf"],
            )
            with gr.Row():
                build_btn = gr.Button("📑 문서 색인하기", variant="primary")
                reset_btn = gr.Button("🗑 전체 초기화")
            status = gr.Markdown()

            gr.Markdown("### 🌐 웹에서 찾아 넣기", elem_classes=["gn-sec"])
            search_kw = gr.Textbox(
                label="검색어", placeholder="예: 포트홀 도로 보수 기준", lines=1
            )
            search_btn = gr.Button("🔍 웹 검색")
            web_results = gr.CheckboxGroup(
                choices=[], label="검색 결과 — 가져올 자료 선택(여러 개 가능)"
            )
            add_btn = gr.Button("➕ 선택한 자료 가져오기", variant="primary")
            web_status = gr.Markdown()
        with gr.Column(scale=2):
            sources_panel = gr.CheckboxGroup(
                choices=[], label="📎 현재 참고중인 파일 (삭제할 항목 선택)"
            )
            with gr.Row():
                delete_btn = gr.Button("🗑 선택 자료 삭제", size="sm")
            del_status = gr.Markdown()
            gr.Markdown("### 2) 대화로 질문하기", elem_classes=["gn-sec"])
            chatbot = gr.Chatbot(height=360, label="대화")
            suggest_radio = gr.Radio(
                choices=[],
                label="💡 추천 질문 (참고 자료 기반 자동 생성 · 클릭하면 입력칸에 채워짐)",
                elem_id="suggest",
            )
            with gr.Row():
                question = gr.Textbox(
                    placeholder="예: 심각한 포트홀은 며칠 안에 보수해야 해?  (Enter로 전송)",
                    scale=8,
                    container=False,
                )
                ask_btn = gr.Button("💬 전송", variant="primary", scale=1, min_width=90)
            clear_btn = gr.Button("🧹 대화 비우기", size="sm")
            sources = gr.Markdown()

    # 색인이 바뀌면(파일 색인 / 웹 자료 추가 / 초기화) 참고 파일 목록과 추천 질문을 새로 만든다.
    build_btn.click(
        build_index, inputs=[files, use_samples, index_state], outputs=[index_state, status]
    ).then(refresh_panel, inputs=index_state, outputs=[sources_panel, suggest_radio])

    reset_btn.click(
        reset_index, inputs=None, outputs=[index_state, status]
    ).then(refresh_panel, inputs=index_state, outputs=[sources_panel, suggest_radio])

    search_btn.click(web_search, inputs=search_kw, outputs=[web_results, web_status])

    add_btn.click(
        add_web_sources, inputs=[index_state, web_results], outputs=[index_state, web_status]
    ).then(refresh_panel, inputs=index_state, outputs=[sources_panel, suggest_radio])

    # 참고 파일에서 선택 자료 삭제 → 인덱스 갱신 후 패널/추천질문도 새로고침.
    delete_btn.click(
        delete_sources, inputs=[index_state, sources_panel], outputs=[index_state, del_status]
    ).then(refresh_panel, inputs=index_state, outputs=[sources_panel, suggest_radio])

    # 추천 질문을 고르면 입력칸에 채워준다.
    suggest_radio.change(lambda q: q or "", inputs=suggest_radio, outputs=question)

    # 대화형 + 스트리밍 답변 (전송 버튼 / Enter 둘 다).
    _chat_io = dict(
        fn=respond, inputs=[index_state, question, chatbot], outputs=[chatbot, question, sources]
    )
    ask_btn.click(**_chat_io)
    question.submit(**_chat_io)
    clear_btn.click(lambda: ([], ""), inputs=None, outputs=[chatbot, sources])

if __name__ == "__main__":
    demo.launch(theme=THEME, css=BRAND_CSS)
