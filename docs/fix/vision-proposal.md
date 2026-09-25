# Jumper Fix — photo check (Nemotron vision layer)

Proposal, not built. Contains one recommendation that argues against part of the idea as stated; please read §3 before approving.

---

## 1. The idea, restated

The student photographs their circuit. A vision model looks at it and helps troubleshoot.

## 2. Where it must sit in the architecture

`fix-mode.md` §11 and §17 are unambiguous: the LLM must not choose probes or declare causes, and the whole flow must work with AI switched off. A vision model that "looks at the photo and tells you what's wrong" breaks both. So the photo layer produces **observations**, never conclusions:

```
photo -> downscale + EXIF strip (client) -> /api/vision (server) -> Nemotron
      -> Observation[] (Zod-validated, each with confidence)
      -> student confirms ("Is this right?")
      -> Effects  (the same faultId -> Weight currency as a probe answer)
      -> the existing deterministic engine
```

This is the same seam already designed for rules-engine findings (`rule-map.ts`) and pasted upload errors. The engine needs **zero** changes — one more evidence source, same update path. If the API is down, the key is missing, or the student declines the camera, nothing breaks; they answer probes instead.

```ts
export const observationSchema = z.object({
  id: z.string().min(1),            // 'led-flat-side-toward-gnd', 'wire-in-pin-0'
  value: z.union([z.boolean(), z.string(), z.number()]),
  confidence: z.number().min(0).max(1),
  /** Normalised box so the confirmation card can point at what it means. */
  region: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});
```

`content/fix/vision-map.ts` maps observation id + value → `Effects`. **Content, not code** — same rule as everything else.

---

## 3. What a photo can and cannot tell you (the part that changes the design)

I searched NVIDIA's own docs before writing this. The Nemotron VL line — `nvidia/nemotron-nano-12b-v2-vl`, and the earlier `nvidia/Llama-3.1-Nemotron-Nano-VL-8B-V1` — is positioned as **document intelligence**: invoices, receipts, manuals, charts, multi-image and video understanding, VQA and summarisation. It is not a model tuned for fine-grained spatial inspection of a physical object, and a breadboard photo is close to the hardest case of that: 30 identical columns of identical holes, thin wires crossing each other, occlusion by the student's hand, phone-camera glare on white plastic.

So I'd tier what we ask it for, and let only the safe tiers reach the engine:

| Tier | Examples | Treatment |
|---|---|---|
| **A — likely reliable** | Which parts are visible; is it an Uno-shaped board; is the USB cable plugged in; is a breadboard in use; roughly how many jumper wires; are there scorch marks, melted plastic, a swollen battery pack, mains-voltage wiring | May produce evidence directly (after the student confirms) |
| **B — needs confirmation** | LED's flat rim orientation; resistor colour bands; which rail row wires land on; whether anything sits in the 0/1 end of the header | Shown as a pre-filled answer the student corrects; only then evidence |
| **C — do not trust** | "the leg is in column 14"; "that wire goes to pin 9"; continuity; whether a joint is actually making contact | Never consumed. Asking for it at all invites a confident wrong answer |

Anything that would put a fault above the 0.7 presentation threshold on tier-C reasoning is a wrong diagnosis at 11pm, which §1 of the module prompt calls the thing we least want to do.

### 3.1 The two uses that are actually worth building

**a) Safety triage — do this first and unconditionally.** A photo is genuinely good at "is something scorched, melted, smoking, or wired to a wall socket". That's tier A, it's the one place a false positive is *cheap* (we tell them to unplug — no harm), and it directly strengthens §10's stop conditions, which currently depend on a student self-reporting a burning smell. This alone justifies the feature.

**b) Filling in the wiring form, not replacing the student.** §4.4 asks the student to describe wiring pin by pin ("HC-SR04 VCC → 5V, Trig → pin 9…"). That form is the most tedious screen in the product and the one most likely to be abandoned. A photo that **pre-fills it** — with every field marked "we think", editable, nothing assumed — turns five minutes of typing into ten seconds of correcting. The student's corrections are ground truth; the model's guesses never are. That is the highest-value framing of this feature, and it's a form-filler, not a diagnostician.

Both of these keep the model out of the diagnosis, which is where §17 wants it.

---

## 4. Verified model facts (and what's still unverified)

From NVIDIA's docs today:

- Model id referenced as **`nvidia/nemotron-nano-12b-v2-vl`**, released 2025-10-28 on Hugging Face and build.nvidia.com; multi-image and video capable; stated as ready for commercial use.
- **Image limits: 12-tile layout, 512×512 per tile — up to 2048×1536 (4×3) or 1536×2048 (3×4); minimum 32×32.** That's a concrete client-side target: downscale every photo to fit 1536×2048 before upload. Good for slow connections too.
- Earlier option: `nvidia/Llama-3.1-Nemotron-Nano-VL-8B-V1`, document-intelligence focused.
- Deployment is via NVIDIA NIM (NGC Docker container, GPU required) or the hosted endpoints on build.nvidia.com.

`// VERIFY:` the exact API base URL, the request shape (whether images go as `image_url` with a base64 data URI, or NIM's HTML-`<img>`-in-content convention), rate limits and pricing are **not** confirmed — the reference page I fetched doesn't state them. I'll pin those from a live call against your key before writing the client, not from memory.

---

## 5. Before it's allowed to influence a diagnosis: an eval set

I can't honestly gate this on anything but measurement, and a document-intelligence model on breadboard photos is exactly the case where intuition will be wrong in both directions.

- **60 labelled photos**: 10 each for the six `led-doesnt-light` faults already drafted (backwards LED, legs in one strip, no ground path, loose leg, wrong resistor, dead LED), shot on ordinary phone cameras, ordinary desk lighting, some with a hand in frame, some blurry — because that's what arrives at 11pm.
- Measure **per-observation-id precision and recall**.
- **Gate: an observation id may carry non-neutral weight only at precision ≥ 0.9.** Below that it is demoted to a pre-filled question the student answers. The gate lives in content, so tightening it later is a data change.
- The harness is provider-agnostic. Claude is already in the stack per §11, so running both through the same 60 photos costs one extra config line and turns "which model" into a measured question rather than an argument. I'm not advocating either — I'm saying don't pick before the eval exists.

**This eval set is the long pole.** Without it I'd be shipping a confident-sounding guess into the one product whose whole premise is not doing that.

---

## 6. Privacy, cost, offline

- **Opt-in per photo**, never automatic. §12 allows no personal data in logs.
- Strip EXIF (GPS, device) client-side before upload. A student's bedroom photo carries a location tag.
- **Not stored by default.** Inference, then discard. Storage only on explicit opt-in for the review queue, and then a flag in the UI that says so.
- Faces and room backgrounds: the crop guide should encourage a top-down shot of the board, which mostly avoids both.
- Network required. The rest of Fix works offline (§13); the photo button simply doesn't appear when offline.
- Key server-side only, in `app/api/vision/route.ts`. Never shipped to the client.

---

## 7. Files, and when

Proposed as **Fix M8**, after M6 — it reuses M6's AI-layer plumbing (server routes, schema-validated model output, the review queue for low-confidence cases). The eval set can be collected in parallel starting now.

```
/app/api/vision/route.ts        server-only NIM call, Zod-validated response
/lib/fix/vision
  schema.ts                     Observation, VisionResult
  prompt.ts                     the extraction prompt (tier A + B only, never "what's wrong")
  client.ts                     provider adapter (NIM today, swappable)
  gate.ts                       precision gate: observation -> evidence | question
  vision.test.ts                against recorded fixtures, no network in CI
/content/fix/vision-map.ts      observation -> Effects (content)
/components/fix
  PhotoCapture.tsx              camera, crop guide, client downscale to 1536x2048, EXIF strip
  ObservationConfirm.tsx        "we think we see this — right?"
/evals/vision/                  60 labelled photos + scoring script
```

---

## 8. Questions

**⛔ Q1 — the eval set.** Can you or your students produce ~60 labelled photos of deliberately broken circuits? If not, my recommendation is to ship **only** the tier-A safety triage (§3.1a), where a false positive costs nothing, and hold everything else.

**⛔ Q2 — hosting.** Hosted endpoint on build.nvidia.com, or self-hosted NIM on your own GPU? This decides latency, cost per photo and whether photos leave your infrastructure. Do you already have an NVIDIA API key I should target?

**Q3 — form-filler vs diagnostician.** Do you agree with §3.1b — photo pre-fills the wiring form and the student corrects it — rather than the photo being its own diagnostic path?

**Q4 — §11 amendment.** The module prompt says "Use the Anthropic API from server routes only." Adding NVIDIA makes that line false. Want me to amend §11 of `docs/prompts/fix-mode.md` to "server routes only, one adapter per provider", or keep providers named explicitly?

**Q5 — scope of the first cut.** Safety triage only (small, high value, low risk), or safety triage plus wiring-form pre-fill in the same milestone?
