# SEO Growth Plan — Fishtown Web Design

A growth roadmap grounded in **Google Search Console + Semrush exports** and reconciled with the **actual site implementation** in `public/` and routes in `server.js`. The first draft of this plan was intentionally analytics-first; the section below documents what is really shipped in code so execution work maps to real files.

This treats growth as an **organic + local-entity + authority** problem—not a “tweak meta tags and wait” problem.

---

## Site implementation review (`public/` + `server.js`)

This is what the codebase shows today (not inferred from tools alone).

### Routing and canonical discipline

- **`server.js`** enforces **HTTPS** (when not behind a proxy) and a **301 from apex to `www`** (`fishtownwebdesign.com` → `https://www.fishtownwebdesign.com`), which matches the consolidation story in GSC.
- Marketing pages are **explicit `app.get` routes** that `sendFile` to static HTML under `public/` (e.g. `/` → `home.html`, `/web-design` → `web-design.html`, `/seo` → `seo.html`).
- **Legacy URL consolidation:** paths such as `/philadelphia-web-design`, `/web-designer-philadelphia`, `/philadelphia-web-design-firm`, and `/web-design-near-me` **301 to `/web-design`**, which is the right pattern to avoid splitting equity across near-duplicate slugs.

### What exists in `public/` (page inventory)

You already have a **full commercial spine** of static pages with per-page **canonical**, **meta description**, **title**, OG/Twitter on key templates, and shared nav patterns:

| Route (examples) | File |
|------------------|------|
| `/` | `public/home.html` |
| `/web-design` | `public/web-design.html` |
| `/seo` | `public/seo.html` |
| `/pricing`, `/contact`, `/about`, `/faq`, … | matching `public/*.html` |
| Industry | `contractor-web-design.html`, `venue-web-design.html`, `ecommerce-web-design.html`, … |
| Neighborhood / regional | `web-design-fishtown.html`, `web-design-center-city.html`, …, `web-design-lancaster-pa.html` |
| Other offers | `saas-development.html`, `app-development.html`, `startup-product-development.html`, `charity.html`, … |

**Blog posts** are not static HTML in `public/`; slugs are allow-listed in `server.js` (`ALLOWED_BLOG_POSTS`) and rendered from **`views/`** (EJS). The definitive guide and case studies live there—aligned with GSC/Semrush showing blog URLs ranking for some queries.

### Strengths (already in code)

- **Differentiators are in the copy and metadata:** hand-coded, no WordPress, subscription pricing, PageSpeed framing—visible in `home.html` and `web-design.html` heads and body content.
- **`home.html` includes structured data:** `LocalBusiness`, `FAQPage`, and `Service` JSON-LD (strong intent for entity + FAQ rich results when eligible).
- **Absolute `https://www.fishtownwebdesign.com/...` links** in nav reduce accidental hostname drift.
- **Sitemap construction in `server.js`** lists core marketing URLs (good baseline for discovery).

### Gaps and risks visible in the markup (actionable)

1. **Homepage vs `/web-design` keyword overlap**  
   `home.html` and `web-design.html` use **nearly the same positioning** in `<title>` and meta (both lead with “Philadelphia Web Design” + hand-coded / fast). That can encourage **cannibalization** (Google oscillates between `/` and `/web-design` for the same query class). The plan’s “one owner URL per intent” should be applied literally here: decide whether **`/` is the brand + funnel** and **`/web-design` is the primary Philadelphia commercial hub** (or the reverse), then **differentiate titles/H1s** and cross-link so the primary page gets the bulk of internal anchor text for head terms.  
   **Follow-up shipped:** titles/H1s differentiated; services copy on the homepage now routes “build” detail to `/web-design` and SEO detail to `/seo`; redundant SEO feature cards removed from the homepage grid; portfolio intro links to `/web-design`; blog post template CTA adds a **Web design services** button; sitemap gives `/web-design` higher priority and weekly `changefreq`.

2. **`/seo` copy vs E-E-A-T and current ranks**  
   `seo.html` meta claims **“Philadelphia's #1 local SEO agency”** while GSC/Semrush show deep rankings for many competitive SEO queries. Superlatives hurt **trust** when the SERP does not back them up. The plan’s `/seo` overhaul maps directly to **`public/seo.html`**: replace #1 claims with **process, deliverables, reporting samples, scope, and proof** (same URL, safer message).

3. **Structured data complexity**  
   `home.html` `LocalBusiness` includes nested **`areaServed` inside `PostalAddress`** and duplicate/overlapping `areaServed` shapes in the same graph. That pattern can trigger **Rich Results Test / Semrush structured data errors**. Align JSON-LD with **Google’s documented expectations** and your **real GBP model** (e.g. service-area business vs storefront) so entity markup does not contradict how you operate.

4. **`tos.html` weak title**  
   Title is effectively **`Fishtown Web Design`** while the page is Terms of Service—wastes a slot for clarity and can contribute to “duplicate / generic title” noise in audits. Prefer something like “Terms of Service | Fishtown Web Design”.

5. **Maintenance model**  
   Nav and head blocks are **repeated per HTML file** (not a shared partial). IA changes (internal links to a chosen “owner” URL) require **touching many files**—plan batch updates or a small build step later if this becomes painful.

### How the rest of this document uses this section

- Sections on **IA, internal linking, and `/seo` credibility** should be executed against the **files named above**, not against a generic WordPress mental model.
- Semrush “duplicate title” / structured data flags should be triaged starting from **`home.html`**, **`web-design.html`**, **`seo.html`**, and **`tos.html`**.

---

## 1. Situation analysis (what the data is really saying)

### A. Demand exists; conversion from SERP visibility does not (yet)

In GSC, **high impressions** on core Philadelphia intents (`philadelphia web design`, `website design philadelphia`, large SEO clusters) paired with **average positions roughly page 5–10+** and **near-zero CTR** is the classic signature of: **you are in the consideration set Google tests, but you are not in the competitive band** where users click.

### B. The SERP is not “10 blue links”

Semrush rows repeatedly show **Local pack**, **People also ask**, **Video**, and often **AI overview**. Competitors appear as **#1 / Local pack** for many of the same queries where you are **90+** or not in top 100 in tracking. Practically: even strong on-page on one URL will not capture the whole demand curve if the SERP is **map-heavy** and **brand-heavy**.

### C. Competitors win on proof density + footprint + links that look like the real world

Backlink samples: **The 215 Guys** and **Kelly** show **client-site credits**, **local orgs**, and **legitimate directory/editorial placements** (the pattern you want). Your export showed a **high proportion of spam/scraper-type links** plus very few **clean, editorial, local commercial** signals. Google is unlikely to treat those spam links as durable ranking fuel.

### D. You have “pockets of relevance” already—those are your levers

Examples implied across GSC + Semrush organic exports: comparatively better positioning around **plural “designers”**, **“custom websites”**, and some **affordable/local SEO** phrasing landing on `/seo` vs the deepest head terms on the homepage. That is where **tightening intent + internal linking** can move the needle fastest.

### E. URL/intent mismatch is costing commercial queries

Keyword Gap showed **`small business website design philadelphia`** ranking to your **blog guide** while competitors rank **service/home URLs**. That usually **caps** commercial performance because Google picks the URL that best matches transactional intent.

### F. Technical credibility is not the same as “clean Semrush audit”

Your audit export flags meaningful hygiene categories (**4xx**, **broken internals**, **duplicate titles/descriptions at scale**, **structured data errors**, **sitemap issues**, **redirect chain/temp redirect volume**). Even if Core Web Vitals lacks CrUX volume in GSC, **crawl hygiene + clarity of indexing** still matters—especially for a site with many location/service URLs.

### G. Hostname consolidation still matters for measurement and consolidation

GSC previously showed materially different performance for **`www` vs non-`www`**. If redirects/canonicals are now correct, treat **one hostname as canonical everywhere** (site, GBP website link, social, email signatures, client footer credits, press).

---

## 2. Strategic positioning (how you compete without copying incumbents)

You will not out-“generic agency” larger Philadelphia incumbents on breadth overnight. You compete with a **sharp wedge**:

- **Hand-coded, performance-first, subscription model** (real differentiation)
- **Industry depth** (contractors, venues, ecommerce, startups—pages already exist; make them *best-in-class*, not thin “SEO pages”)
- **Philadelphia neighborhood coverage** as **supporting relevance**, not as ten near-duplicate clones
- **Proof-led SEO** (case studies, methodology, deliverables, reporting samples)—especially on `/seo`, which must read like a senior operator wrote it, not a brochure paragraph

**Positioning rule:** every major page answers **who it’s for**, **what you deliver**, **how pricing works**, **what proof exists**, **what happens first**, **what you need from the client**—in that order.

---

## 3. Information architecture (IA): assign one “owner URL” per intent

### Primary commercial clusters (owner pages)

Define **one canonical money URL** per cluster and stop splitting equity across near-duplicates:

- **Philadelphia web design hub** (city service hub; homepage can support it, but many agencies succeed with a dedicated hub + homepage reinforcement—pick one model and commit)
- **`/seo`** as the **SEO services** owner (not the blog, not TOS)
- **Industry pages** (`/contractor-web-design`, `/venue-web-design`, `/ecommerce-web-design`, etc.) as owners for industry modifiers
- **Neighborhood pages** as **child pages** that feed the hub (internal links up), not competing hubs

### Fix the known mismatch (commercial vs blog)

For queries like **small business website design Philadelphia**:

- Create or strengthen a **commercial landing experience** (service page or expanded homepage section) that matches transactional intent.
- Keep the **guide** as supporting content, but **down-rank its eligibility** for money terms by adjusting emphasis, title framing, internal links, and on-page focus—**without** removing the guide’s value for informational queries.

---

## 4. On-page SEO standards (non-negotiables for an agency site)

### Title + meta strategy (SERP CTR engineering)

For money pages, titles should include:

- **Primary term** (once, naturally)
- **Differentiator** (hand-coded / fast / subscription)
- **Geo** where relevant (Philadelphia)

Avoid “SEO-shaped” titles that sound like everyone else. Your differentiation is legitimate—use it.

### H1/H2 discipline

- One clear **H1** aligned with the query class
- H2s map to **decision sections**: process, timelines, deliverables, pricing model, proof, FAQs

### Proof modules (repeat sitewide)

- **3–6 case tiles** with metrics (before/after speed; business outcomes are better than rankings alone)
- **Client quotes** + logos (permission-based)
- **Screenshots** of reports/dashboards (redact as needed) if you sell SEO

### FAQ + schema (carefully)

Use FAQ where answers are **stable** and genuinely helpful. Given audit flags around structured data errors, implement conservatively: **validate**, ship, re-audit.

### Internal linking rules

- Every blog case study links to **one** designated money URL for that industry/city cluster
- Footer and hub pages link down to **children**; children link up to **hub** + to **contact/pricing**
- Avoid orphan “money” pages (GSC/Semrush often reveal impressions without internal authority paths)

---

## 5. Content program (12 months): build topical authority without fluff

### Tier A (0–90 days): finish the commercial spine

Ship or substantially upgrade:

- **Philadelphia hub** content: what you do, who it’s for, neighborhoods served, proof, objections (WordPress vs hand-coded), timelines
- **`/seo` overhaul** into a credible service page: audits, tracking, local SEO scope, reporting cadence, what you won’t promise, example deliverables
- **Three industry pages** to “best in class” depth (start with what you sell most)

### Tier B (90–180 days): answer the SERP content

Create content explicitly targeting:

- **Comparisons** (agency vs freelancer vs DIY builders—honest, non-snarky)
- **Pricing education** aligned to your model (subscription vs lump sum—maps to your pricing page)
- **Technical explainers** that match your brand (performance, Core Web Vitals, schema, IA)—these attract links

### Tier C (ongoing): digital PR + data

Quarterly publish **one asset people cite**:

- Philadelphia SMB website benchmark (small sample methodology, transparent limitations)
- “We rebuilt X in Y weeks—here’s the stack and results” (deep case narratives)

### What not to do

- Do not publish **many neighborhood pages** that differ only by swapped city strings  
  **Clarification:** This does **not** mean removing existing neighborhood landings you already ship (e.g. `web-design-fishtown`, `web-design-center-city`). Keep them if they have **distinct copy and intent**; improve internal linking to your chosen Philadelphia **hub**; delete or merge only when two URLs are **true duplicates** with no unique value.
- Do not chase **spammy long-tail** your pricing page accidentally attracts (e.g. unrelated “web design pricing [town] NJ” patterns)—decide later whether to **narrow**, **canonicalize**, or **rewrite** those templates after review

---

## 6. Local SEO and entity strategy (maps realism + organic uplift)

### Google Business Profile (GBP)

Operate as a legitimate **service-area business** if that matches how you work, with accurate categories and a **tight service area**. Do not treat maps as the entire strategy, but **do not leave GBP weak**—it influences trust, branded discovery, and can appear across surfaces.

### Citations (selective, not hundreds of directories)

Match **high-trust** industry/local profiles where competitors appear (quality over quantity). Keep **NAP consistency** with your canonical domain choice.

### Reviews (a growth system, not hope)

Implement a **post-launch review request** workflow at project milestones. Reviews improve **conversion** and often correlate with stronger local visibility for eligible queries.

---

## 7. Link acquisition: copy the competitor pattern, not their scale

### Target link types (priority order)

1. **Client-site footer/about credit** (dofollow where allowed; always ethical and disclosed as appropriate)
2. **Partners** (photographers, brand strategists, ad agencies, accountants serving SMBs)
3. **Local org sponsorships** (high relevance, legitimate community involvement)
4. **Podcasts / local business media** (even small outlets earn clean mentions)
5. **Select directories** that actually send traffic or are industry-standard (patterns similar to UpCity/DesignRush-class placements seen on competitors)

### Disavow?

Usually **not** the first move. Focus on **earning** enough clean signals that spam becomes noise. Monitor **manual actions** and odd ranking swings; disavow only with a coherent strategy.

### Backlink monitoring cadence

Monthly: **new referring domains**, anchor mix, sudden spikes of garbage (common in agency niches).

---

## 8. Technical SEO program (practical triage from audit flags)

Work in this order:

1. **Indexing and canonical policy**: one preferred hostname; consistent internal links; clean redirects for legacy URLs
2. **4xx + broken internal links/images**: fix top templates first (global nav/footer often causes mass breakage)
3. **Sitemap accuracy**: only canonical, indexable marketing URLs; exclude junk/staging if any leaks exist
4. **Redirect chains / temp redirects**: reduce chains on high-traffic templates (crawl budget + clarity)
5. **Duplicate titles/meta**: fix patterns (templated pages) rather than one-off forever
6. **Structured data**: fix errors first on **Organization/LocalBusiness** (if used), **WebSite**, **BreadcrumbList**, **FAQ** (if deployed)

Use **lab performance** (PageSpeed Insights / Lighthouse) on templates until CrUX populates in GSC.

---

## 9. Conversion optimization (it feeds SEO indirectly)

Agency SEO fails when traffic arrives but does not convert (weak case studies, unclear offer, no pricing pathway).

Minimum upgrades:

- **Above-the-fold clarity**: offer + geography + proof + one CTA
- **Pricing page** as a sales instrument, not an SEO net for irrelevant long-tail
- **Fast contact paths** + calendar if you use it
- **Trust stack**: process diagram, timeline, “what you get monthly” for subscription

---

## 10. KPIs and reporting (so morale tracks reality)

### Leading indicators (weekly/monthly)

- **Impressions + average position** for a fixed basket of **20 keywords** (head + mid-tail + industry)
- **GSC queries moving from >50 to <20** average position (velocity matters)
- **Indexed money URLs** + coverage issues trend
- **Referring domains** from a defined “quality list” (even 2–4 per month is strong early)

### Lagging indicators (quarterly)

- **Qualified form fills** from organic (GA4 landing page + session source/medium)
- **Branded search trend** (`fishtown web design` is a healthy signal in GSC)

### Competitive benchmarks

Track the same basket against **The 215 Guys**, **Kelly Website Design**, and **John Walsh** in Semrush Position Tracking—but judge progress on **your slope**, not their ceiling.

---

## 11. 90-day execution roadmap

### Days 1–14: Foundation + measurement

- Lock **canonical domain** and align GBP, GA4, email, client credits
- Create the **keyword basket** (20–40) + **URL map** (owner page per intent)
- Export **GSC last 90 days** for `www` only (clean trendline)
- Semrush: pull **Keyword Gap → Missing** (100–300 rows) + **Top pages** export for a lead competitor (template discovery)

### Days 15–30: Highest-impact fixes

- Fix audit **errors affecting templates** (4xx, broken internal, sitemap, structured data errors)
- Rebalance internal linking: **hub → industry → case studies → contact**
- Begin **`/seo` credibility rewrite** + proof modules (supports selling SEO ethically)

### Days 31–60: Commercial spine + differentiation

- Ship or upgrade **Philadelphia hub** + **three industry pages** to best-in-class
- Resolve **blog vs commercial intent** for SMB web design queries (commercial owner URL)
- Publish **two deep case studies** with measurable outcomes + internal links to the right hubs

### Days 61–90: Authority + distribution

- Launch **review acquisition workflow**
- Execute **5–10 outreach targets** (partners, clients, local media) for legitimate mentions/links
- Add **one quarterly benchmark or report** asset worth citing

---

## 12. Six- to twelve-month outlook (expectations management)

- **Months 0–3:** Hygiene + IA + proof + internal linking → often yields **mid-tail** movement first
- **Months 3–6:** Content depth + clean links → **page 2 to page 1** on selected terms becomes realistic for some clusters
- **Months 6–12:** Compounding: brand search rises, more pages earn impressions, GBP/reviews improve conversion on local-intent queries

Head terms like **`web design philadelphia`** may remain volatile because of **map pack dominance**; the plan should still target them, but **winning the business** usually comes from **combined** organic + brand + proof + local trust—especially for a newer agency brand.

---

## 13. Ethical guardrails for selling SEO

Because SEO is a service you sell:

- Publish **scope boundaries** (what local SEO is and is not, timelines, what requires client action)
- Show **reporting samples** and **methodology** (no black box)
- Avoid **guarantee language**; use **process + leading indicators**

---

## Source data (client exports + codebase)

- **GSC:** `GSC Performance/`, `GSC Indexing/`, `GSC Top Linking Sites.csv`, `GSC Top Linking Pages.csv`
- **Semrush:** Position tracking overview, Keyword Gap, Organic Positions (fishtown + competitors), Backlinks exports, Site Audit (`issues`, `pages`, structured data, mega export), Keyword Magic (`philadelphia-web-design` broad, US)
- **Site code:** `public/*.html` (static marketing pages), `server.js` (routes, redirects, sitemap, www), `views/` (allow-listed blog EJS)

---

*Document generated from the agreed audit and strategy. Update KPIs and dates as execution progresses.*
