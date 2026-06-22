"""청크 크기 개선 효과 검증 (개선 전/후, 수치 비교).

가설: 청크를 너무 크게 자르면 검색은 되지만 답변 컨텍스트에 불필요한 내용이
       섞여 핵심이 흐려진다. 청크를 의미 단위로 작게 끊으면 '정답은 그대로
       검색되면서(재현율 유지)' 컨텍스트의 잡음 글자가 줄어든다.

측정: 같은 질문에 BM25로 상위 청크를 검색했을 때
   - 정답포함(재현율): 정답 키워드가 검색된 컨텍스트 안에 있는가 (있어야 정상)
   - 컨텍스트 글자수: 답변 프롬프트에 들어갈 총 글자수 (작을수록 잡음 적음)
   - 잡음비율: 정답과 무관한 줄의 글자 비율 (작을수록 핵심이 안 흐려짐)

앱의 실제 _chunk / _tokenize 로직을 그대로 복사해 공정하게 비교한다(API 불필요).
실행: python prototypes/rag-search/verify_chunking.py
"""

import os
import re

# ---- 앱 app.py 와 동일한 로직(복사) ----
def _chunk(text, size=400, overlap=60):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, buf = [], ""
    for p in paras:
        if len(buf) + len(p) + 1 <= size:
            buf = f"{buf}\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
            buf = (buf[-overlap:] + "\n" + p) if buf else p
            while len(buf) > size:
                chunks.append(buf[:size])
                buf = buf[size - overlap:]
    if buf:
        chunks.append(buf)
    return chunks


def _tokenize(text):
    words = re.findall(r"[0-9a-zA-Z]+|[가-힣]+", text.lower())
    tokens = []
    for w in words:
        tokens.append(w)
        if len(w) >= 2 and re.match(r"[가-힣]+", w):
            tokens += [w[i:i + 2] for i in range(len(w) - 1)]
    return tokens


def _bm25_scores(corpus_tokens, query_tokens, k1=1.5, b=0.75):
    """rank_bm25 없이도 돌도록 BM25 직접 구현(앱과 동일 공식)."""
    import math
    N = len(corpus_tokens)
    avgdl = sum(len(d) for d in corpus_tokens) / N
    df = {}
    for doc in corpus_tokens:
        for t in set(doc):
            df[t] = df.get(t, 0) + 1
    scores = []
    for doc in corpus_tokens:
        freq = {}
        for t in doc:
            freq[t] = freq.get(t, 0) + 1
        s = 0.0
        dl = len(doc)
        for t in set(query_tokens):
            if t not in freq:
                continue
            idf = math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5))
            tf = freq[t]
            s += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl))
        scores.append(s)
    return scores


def retrieve(chunks, query, top_k=2):
    corpus = [_tokenize(c) for c in chunks]
    scores = _bm25_scores(corpus, _tokenize(query))
    order = sorted(range(len(chunks)), key=lambda i: -scores[i])[:top_k]
    return [chunks[i] for i in order]


def noise_metrics(retrieved, keywords):
    """검색된 청크들에서 정답 키워드가 든 줄=신호, 나머지=잡음."""
    total, signal, recall = 0, 0, False
    for chunk in retrieved:
        for line in chunk.splitlines():
            line = line.strip()
            if not line:
                continue
            total += len(line)
            if any(kw in line for kw in keywords):
                signal += len(line)
                recall = True
    noise_ratio = 0 if total == 0 else (total - signal) / total
    return total, recall, noise_ratio


# ---- 테스트 질의(정답 키워드 = 그 질문의 핵심 답이 든 줄에만 등장) ----
QUERIES = [
    {"q": "심각 등급 포트홀은 몇 시간 안에 보수해야 해?", "kw": ["24시간"]},
    {"q": "균열 폭 몇 mm부터 보수 대상이야?", "kw": ["3mm 이상이면 보수"]},
    {"q": "도로 조명 가로등 점검 주기는?", "kw": ["조명(가로등)"]},
]

# 개선 전/후 청크 설정
BEFORE = {"size": 1200, "overlap": 0}   # 너무 크게: 문서 통째가 한 청크
AFTER = {"size": 250, "overlap": 40}    # 의미 단위로 작게


def load_docs():
    here = os.path.dirname(os.path.abspath(__file__))
    docs = {}
    sd = os.path.join(here, "sample_docs")
    for name in os.listdir(sd):
        if name.endswith(".md"):
            with open(os.path.join(sd, name), encoding="utf-8") as f:
                docs[name] = f.read()
    return docs


def run(cfg):
    docs = load_docs()
    all_chunks = []
    for text in docs.values():
        all_chunks += _chunk(text, cfg["size"], cfg["overlap"])
    rows = []
    for item in QUERIES:
        retrieved = retrieve(all_chunks, item["q"], top_k=2)
        total, recall, noise = noise_metrics(retrieved, item["kw"])
        rows.append((item["q"], recall, total, noise))
    n_chunks = len(all_chunks)
    avg_chunk = sum(len(c) for c in all_chunks) / n_chunks
    return n_chunks, avg_chunk, rows


def main():
    print("=" * 68)
    print(" 청크 개선 전/후 검증 (실제 샘플 문서 3건, BM25 검색, top-2)")
    print("=" * 68)
    for label, cfg in [("개선 전", BEFORE), ("개선 후", AFTER)]:
        n, avg, rows = run(cfg)
        print(f"\n[{label}] size={cfg['size']}, overlap={cfg['overlap']}  "
              f"→ 총 청크 {n}개, 평균 {avg:.0f}자/청크")
        print(f"  {'질문':<26}{'정답포함':<9}{'컨텍스트글자':<12}{'잡음비율'}")
        tot_chars, tot_noise, recalls = 0, 0, 0
        for q, recall, total, noise in rows:
            recalls += int(recall)
            tot_chars += total
            tot_noise += noise
            mark = "O" if recall else "X"
            print(f"  {q[:24]:<26}{mark:<9}{total:<12}{noise * 100:>5.1f}%")
        print(f"  → 정답포함 {recalls}/{len(rows)}  "
              f"평균 컨텍스트 {tot_chars / len(rows):.0f}자  "
              f"평균 잡음 {tot_noise / len(rows) * 100:.1f}%")
    print()


if __name__ == "__main__":
    main()
