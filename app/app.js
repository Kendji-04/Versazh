const STATE = {
  reviews: [],
  loading: false,
  modelUrl: "https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english",
};

const els = {
  token: document.getElementById("hfToken"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  reviewText: document.getElementById("reviewText"),
  resultIcon: document.getElementById("resultIcon"),
  resultLabel: document.getElementById("resultLabel"),
  resultScore: document.getElementById("resultScore"),
  status: document.getElementById("status"),
  count: document.getElementById("count"),
  modelStatus: document.getElementById("modelStatus"),
};

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle("error", isError);
}

function setModelStatus(msg) {
  els.modelStatus.textContent = msg;
}

function setCount(n, ready = true) {
  els.count.textContent = ready ? `${n} reviews loaded` : "Loading reviews…";
}

function iconState(sentiment) {
  els.resultIcon.className = "fa-regular"; // reset base
  if (sentiment === "positive") {
    els.resultIcon.className = "fa-solid fa-thumbs-up pos";
  } else if (sentiment === "negative") {
    els.resultIcon.className = "fa-solid fa-thumbs-down neg";
  } else {
    els.resultIcon.className = "fa-regular fa-circle-question neu";
  }
}

async function loadReviews() {
  try {
    setCount(0, false);
    const res = await fetch("reviews_test.tsv", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch TSV (${res.status})`);
    const text = await res.text();
    const parsed = Papa.parse(text, {
      header: true,
      delimiter: "\t",
      skipEmptyLines: "greedy",
    });
    const rows = Array.isArray(parsed?.data) ? parsed.data : [];
    STATE.reviews = rows
      .map((r) => (r && typeof r.text === "string" ? r.text.trim() : ""))
      .filter((t) => t.length > 0);
    setCount(STATE.reviews.length, true);
    if (STATE.reviews.length === 0) {
      setStatus("No reviews found in TSV (expected a 'text' column).", true);
    } else {
      setStatus("Ready");
    }
  } catch (err) {
    setCount(0, true);
    setStatus(`Error loading TSV: ${err.message}`, true);
  }
}

function pickRandomReview() {
  if (!STATE.reviews.length) return null;
  const idx = Math.floor(Math.random() * STATE.reviews.length);
  return STATE.reviews[idx];
}

async function inferSentiment(reviewText, token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  const body = JSON.stringify({ inputs: reviewText });
  const resp = await fetch(STATE.modelUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let friendly = `HTTP ${resp.status}`;
    if (resp.status === 401) friendly = "Unauthorized (invalid or missing token)";
    if (resp.status === 429) friendly = "Rate limited (please retry later)";
    if (resp.status === 503) friendly = "Model loading (try again in a moment)";
    throw new Error(`${friendly}${text ? ` — ${text}` : ""}`);
  }

  const json = await resp.json();

  // Response shape: [[{label:'POSITIVE', score: number}, {label:'NEGATIVE', score:number}]]
  const arr = Array.isArray(json) ? (Array.isArray(json[0]) ? json[0] : json) : [];
  const candidates = arr.filter(
    (x) => x && typeof x.label === "string" && typeof x.score === "number"
  );

  if (!candidates.length) throw new Error("Unexpected API response shape.");

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  const label = String(top.label || "").toUpperCase();
  const score = Number(top.score || 0);

  let sentiment = "neutral";
  if (score > 0.5 && label === "POSITIVE") sentiment = "positive";
  else if (label === "NEGATIVE") sentiment = "negative";

  return { sentiment, score };
}

async function onAnalyze() {
  if (STATE.loading) return;
  els.analyzeBtn.disabled = true;
  STATE.loading = true;
  setModelStatus("Analyzing…");
  setStatus("Selecting a random review…");

  try {
    const review = pickRandomReview();
    if (!review) {
      throw new Error("No reviews available. Ensure TSV has a 'text' column.");
    }
    els.reviewText.textContent = review;

    setStatus("Calling Hugging Face Inference API…");
    const token = els.token.value;
    const { sentiment, score } = await inferSentiment(review, token);

    iconState(sentiment);
    const labelPretty =
      sentiment === "positive" ? "Positive" : sentiment === "negative" ? "Negative" : "Neutral";
    els.resultLabel.textContent = labelPretty;
    els.resultScore.textContent = `Score: ${score.toFixed(3)}`;
    setStatus("Done");
    setModelStatus("Model idle");
  } catch (err) {
    iconState("neutral");
    els.resultLabel.textContent = "Neutral";
    els.resultScore.textContent = "";
    setModelStatus("Model idle");
    setStatus(`Error: ${err.message}`, true);
  } finally {
    STATE.loading = false;
    els.analyzeBtn.disabled = false;
  }
}

els.analyzeBtn.addEventListener("click", onAnalyze);
loadReviews();
