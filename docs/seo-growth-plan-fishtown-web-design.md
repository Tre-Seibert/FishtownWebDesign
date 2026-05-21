# SEO Growth Plan — Fishtown Web Design

A growth roadmap grounded in **Google Search Console + Semrush exports** and reconciled with the **actual site implementation** in `public/` and routes in `server.js`. The first draft of this plan was intentionally analytics-first; the section below documents what is really shipped in code so execution work maps to real files.

This treats growth as an **organic + local-entity + authority** problem—not a “tweak meta tags and wait” problem.

---

## §0 — Execution Checklist

Work through these in order. Do not skip ahead — earlier items have higher ROI and some later items depend on earlier ones being done. Check the box when complete. Each item maps to a specific file or off-site action.

---

### Horizon 1: This Week (Days 1–7)
*No-cost, highest-leverage actions. None of these require touching code.*

**Google Business Profile (GBP)**
- [ ] 1. Email every past client asking for a Google review. Include the direct GBP review link. Keep it short: one sentence of context, one sentence asking, the link. Target: 4–5 new reviews within 2 weeks.
- [ ] 2. Post an update on your GBP right now — a photo of recent work, a new client launch, anything. Do this weekly going forward. An inactive GBP hurts local pack ranking.
- [ ] 3. Confirm your GBP primary category is set appropriately. Current: “Website designer.” Consider changing to “Web design company” — the business vs. individual distinction matters for how Google categorizes you.

**Directory Listings (free, high-authority backlinks)**
- [ ] 4. Create a free agency profile on **DesignRush.com** (Authority Score 58 — The 215 Guys have this, you don't)
- [ ] 5. Create a free agency profile on **GoodFirms.co** (AS 51 — The 215 Guys have this, you don't)
- [ ] 6. Apply for a listing on **Expertise.com** — search “web design Philadelphia” on their site and submit your agency
- [ ] 7. Create a free profile on **UpCity.com** (AS 42 — The 215 Guys have this, you don't)

**Client Footer Credits**
- [ ] 8. Ask every past client to add “Website by Fishtown Web Design” with a link to `https://www.fishtownwebdesign.com` in their site footer. Confirmed already linking: Axel Mechanical, Green Shades Coffee, Shawnee Run Venue. Contact all others.

---

### Horizon 2: This Month (Days 8–30)
*Code-level technical fixes and content. These can be done with Claude directly — paste the task into chat.*

**Technical Fixes (ask Claude to do these)**
- [x] 9. Find and fix the **4 four-oh-four errors** — OG image 404s fixed across 5 pages (`about.html`, `contact.html`, `pp.html`, `pricing.html`, `tos.html`); all pointed to non-existent directories, redirected to `/public/content/home/logometa.png`. ✅ Done 2026-05-20
- [x] 10. Fix the **9 broken internal links** across `public/*.html` — footer links to `/terms-of-service` and `/privacy-policy` replaced with `/tos` and `/pp` in `about.html`, `charity.html`, `home.html`; fixed `og:image:height` typo (`"F630"` → `"630"`) in `pricing.html`. ✅ Done 2026-05-20 *(verify remaining links on re-crawl)*
- [x] 11. Fix the **6 broken internal images** — favicon paths corrected from underscore to dash (`android_chrome` → `android-chrome`) across 7 files: `contact.html`, `faq.html`, `pp.html`, `pricing.html`, `tos.html`, `unsubscribe.html`, `views/blog-index.ejs`. ✅ Done 2026-05-20
- [x] 12. Fix **3 duplicate title tags** — `pp.html` title changed from `"Fishtown Web Design"` to `"Privacy Policy | Fishtown Web Design"`. ✅ Partial 2026-05-20 *(remaining 2 likely in blog/dynamic pages — confirm on re-crawl)*
- [ ] 13. Fix **3 duplicate meta descriptions** — identify which pages share descriptions and differentiate them
- [x] 14. Fix **6 structured data errors** — switched schema to service-area business (no physical location), reflected on GBP as well. ✅ Done 2026-05-19
- [x] 15. Fix **2 incorrect pages in sitemap.xml** — `server.js` sitemap updated: `/terms-of-service` and `/privacy-policy` replaced with canonical `/tos` and `/pp`. ✅ Done 2026-05-20
- [ ] 16. **Minify CSS and JS** — 61 unminified files is a page speed drag. Ask Claude to add a minification step to the build or process existing files

**Content**
- [ ] 17. **Rewrite `/seo` page body copy** — replace brochure language with: what you audit, what the client gets monthly, what your reporting looks like, what you will not promise, scope of local SEO vs. organic. No superlatives. File: `public/seo.html`
- [ ] 18. **Clean the Semrush keyword tracking basket** — remove: all “philly seo consultants” strings (competitor branded), all NJ pricing town terms, “baytown seo”, “seo and web hosting georgetown”, “jamestown website design”. Replace with ~30 clean Philly + suburb terms aligned to your actual service area.

---

### Horizon 3: Days 30–90
*Content depth + authority. These compound over time.*

**Content (ask Claude to draft, then you review)**
- [ ] 19. **Deepen `/web-design` page** — add: process steps, timeline, what hand-coded means vs WordPress, before/after speed examples, proof tiles with client outcomes, FAQ section
- [ ] 20. **Deepen `/contractor-web-design`** — most commercially valuable industry page. Add: industry-specific pain points, examples of contractor sites you've built, why speed matters for mobile job-site searches
- [ ] 21. **Deepen `/ecommerce-web-design`** — add: platform options, conversion focus, Shopify vs custom, example (Green Shades)
- [ ] 22. **Write a full Axel Mechanical case study** — before/after page speed, what you built, business outcomes if available, photos. Add to blog. Link internally to `/contractor-web-design`
- [ ] 23. **Write a full Green Shades Coffee case study** — same format. Link internally to `/ecommerce-web-design`
- [ ] 24. **Write one comparison post** — “Web Design Agency vs. Freelancer vs. DIY Website Builders: What Philadelphia Small Businesses Should Know.” Honest, not snarky. This type of content earns links and answers a real question buyers Google before hiring.

**Authority / Off-Site**
- [ ] 25. Identify 3–5 Philadelphia business partners (photographers, brand strategists, accountants serving SMBs) and get a mention or link on their site — a “partners we recommend” style listing or a blog mention
- [ ] 26. Look for one local Philadelphia business org, chamber, or neighborhood association to join or sponsor — these produce real, local, editorial links
- [ ] 27. Build a post-launch review request into your workflow — after every site goes live, send the client a review request email at the 2-week mark. Make this a habit, not a one-time ask.

**Monitoring (ongoing, monthly)**
- [ ] 28. **GSC check:** watch the “affordable” cluster (positions 17–30 confirmed May 2026) for movement toward page 1. Also check that `/web-design` is the top URL for Philly head terms, not the homepage.
- [ ] 29. **Semrush referring domains:** target 2–4 new legitimate referring domains added per month. Track this number monthly — it is the most honest leading indicator of authority growth.
- [ ] 30. **Run Rich Results Test** on `home.html` after any structured data edits.

---

## Implementation status (living checklist)

*Last reviewed: 2026-05-20 (codebase: `public/`, `views/`, `server.js`; Semrush full audit + competitor analysis + backlink gap run 2026-05-19; technical fixes applied 2026-05-20). Update this block whenever you ship meaningful SEO/IA changes.*

| Priority | Item | Status | Where it lives |
|----------|------|--------|----------------|
| P0 | **Owner URL split:** `/` = brand umbrella, `/web-design` = Philadelphia web-design services hub (titles, meta, H1s differentiated) | **Done** | `public/home.html`, `public/web-design.html` |
| P0 | **Homepage entity JSON-LD** aligned to service-area reality (no messy `PostalAddress` + nested `areaServed`); services point at `/web-design` and `/seo` | **Done** | `public/home.html` (`@graph`: `ProfessionalService` + `Service` nodes) |
| P0 | **GBP review velocity:** 4 reviews total, last review 22 weeks ago (~Nov 2025). Local pack ranking requires consistent new reviews. Email every past client immediately; implement post-launch review request workflow. | **Critical / Open** | GBP; off-site action |
| P0 | **Directory listings (DesignRush, UpCity, Expertise.com, GoodFirms):** Competitors have links from all four (AS 40–58). You have zero. These are the fastest legitimate high-authority links available. Create free profiles. | **Open** | Off-site action |
| P1 | **`/seo` credibility — meta/OG “#1” claim** | **Done** | `public/seo.html` — meta description + `og:description` now say “Philadelphia's local SEO agency” (verified 2026-05-19) |
| P1 | **`/seo` credibility — body copy:** page still needs proof, methodology, deliverables, reporting cadence, scope. No superlatives. | **Open** | `public/seo.html` body |
| P1 | **Technical audit fixes (from Semrush 2026-05-19):** ~~4 four-oh-four errors~~ ✅, ~~9 broken internal links~~ ✅, ~~6 broken internal images~~ ✅, ~~2 sitemap redirect URLs~~ ✅, ~~pp.html weak title~~ ✅, ~~6 structured data errors~~ ✅. **Remaining open:** 61 unminified JS/CSS files, 3 duplicate meta descriptions, 2 remaining duplicate titles (blog/dynamic), 3 low word-count pages, 13 low text-to-HTML pages. | **Partial — in progress** | `public/*.html`, `server.js`, CSS/JS pipeline |
| P2 | **`tos.html` title** unique and descriptive | **Done** | `public/tos.html` — `Terms of Service \| Fishtown Web Design` |
| P2 | **Blog → commercial URL:** CTAs and related links to `/web-design` from post template | **Done** | `views/blog-post.ejs`, `views/partials/blog-related-services.ejs` |
| P2 | **Sitemap / priority** for hub URL | **Done** (per prior ship note) | `server.js` sitemap — `/web-design` higher priority / `changefreq` |
| P2 | **Client footer credits:** every site built by FWD should have a “Built by Fishtown Web Design” footer link. Confirmed clients (Axel Mechanical, Green Shades Coffee, Shawnee Run Venue) already linking; ask all past clients to add. | **In progress** | Off-site; client outreach |
| P2 | **Keyword basket cleanup:** remove competitor branded terms (“philly seo consultants” strings), irrelevant NJ pricing terms, “baytown seo”, “seo and web hosting georgetown”. Replace with clean Philly + near-suburb terms. | **Open** | Semrush Position Tracking |
| P3 | **GSC validation:** confirm queries consolidate toward `/web-design` for head Philly web-design terms (no `/` vs `/web-design` flip-flop) | **Monitor** | Google Search Console → Performance → Pages |
| P3 | **Rich Results Test** on `home.html` JSON-LD after major schema edits | **Recommended** | [Google Rich Results Test](https://search.google.com/test/rich-results) |

**Next focus (in order):**
1. **Off-site this week:** email every past client for a Google review; create DesignRush + GoodFirms profiles (free, AS 50+)
2. **Code this week:** fix 4xx errors → broken internal links → broken images (I can do these directly)
3. **Content next 30 days:** body copy rewrite on `/seo` (proof, methodology, scope — no superlatives)
4. **Monitor:** watch GSC for “affordable” cluster (positions 17–30 confirmed) moving toward page 1 — that is your nearest-term win

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
- **`home.html` structured data:** **`@graph`** with **`ProfessionalService`** (service-area, no walk-in), explicit **`Service`** entries with `url` pointing to **`/web-design`** and **`/seo`**, plus **`FAQPage`** and **`WebSite`** JSON-LD. Re-run **Rich Results Test** after future edits.
- **Absolute `https://www.fishtownwebdesign.com/...` links** in nav reduce accidental hostname drift.
- **Sitemap construction in `server.js`** lists core marketing URLs (good baseline for discovery).

### Gaps and risks visible in the markup (actionable) — with status

1. **Homepage vs `/web-design` keyword overlap** — **Done (2026)**  
   **Shipped:** **`/`** uses a **brand-first** title/meta and **H1 `Fishtown Web Design`**; **`/web-design`** owns **“Philadelphia Web Design Services”** in title, meta, and H1. Homepage copy routes build detail to **`/web-design`** and SEO detail to **`/seo`**; portfolio and other internal paths point at the hub as appropriate; blog templates link to **`/web-design`** (see **Implementation status** table).

2. **`/seo` copy vs E-E-A-T and current ranks** — **Open**  
   **`public/seo.html`** still uses **“Philadelphia's #1 local SEO agency”** in `meta description` and `og:description`. Replace with **process, deliverables, reporting samples, scope, and proof** (no superlatives the SERP does not support). Optional: align visible hero copy if it echoes the same tone.

3. **Structured data complexity** — **Done (replaced prior pattern)**  
   The old **`LocalBusiness` + `PostalAddress` + awkward nested `areaServed`** pattern was **removed** in favor of the current **`ProfessionalService` `@graph`** (see Strengths). Remaining risk is only **validation / future drift**—re-test after edits.

4. **`tos.html` weak title** — **Done**  
   Title is now **`Terms of Service | Fishtown Web Design`**.

5. **Maintenance model** — **Ongoing**  
   Nav and head blocks are **repeated per HTML file** (not a shared partial). IA changes still require **batch edits** across `public/*.html` (or a small build/partials layer later).

### How the rest of this document uses this section

- Sections on **IA, internal linking, and `/seo` credibility** should be executed against the **files named above**, not against a generic WordPress mental model.
- Semrush “duplicate title” / structured data flags: **homepage + hub are differentiated**; next triage focus **`seo.html`** (copy + any future schema on that page), then crawl-wide patterns.

---

## 1. Situation analysis (what the data is really saying)

### A. Demand exists; conversion from SERP visibility does not (yet)

In GSC, **high impressions** on core Philadelphia intents (`philadelphia web design`, `website design philadelphia`, large SEO clusters) paired with **average positions roughly page 5–10+** and **near-zero CTR** is the classic signature of: **you are in the consideration set Google tests, but you are not in the competitive band** where users click.

### B. The SERP is not “10 blue links”

Semrush rows repeatedly show **Local pack**, **People also ask**, **Video**, and often **AI overview**. Competitors appear as **#1 / Local pack** for many of the same queries where you are **90+** or not in top 100 in tracking. Practically: even strong on-page on one URL will not capture the whole demand curve if the SERP is **map-heavy** and **brand-heavy**.

### C. Competitors win on proof density + footprint + links that look like the real world

**Confirmed from 2026-05-19 backlink gap export:** The 215 Guys have clean links from yahoo.com (AS 100), bing.com (AS 97), inquirer.com/Philadelphia Inquirer (AS 56), designrush.com (AS 58), upcity.com (AS 42), expertise.com (AS 40), goodfirms.co (AS 51), and hundreds of additional quality referring domains. Fishtown Web Design's legitimate referring domains: ~6 total (axelmechanicalservices.com, greenshadescoffeeco.com, shawneerunvenue.com, lauer-construction.com, miswebdesign.com, mapquest.com listing). Every other entry in the backlink report is a spam/bot directory network with domain authority ≤5. These provide zero ranking value. The gap is structural and is the primary reason head terms remain at page 5–10.

### D. You have “pockets of relevance” already—those are your levers

**Confirmed from 2026-05-19 Semrush position tracking export:** your nearest-term page 1 opportunities are:
- “affordable philadelphia seo company” — **position 18**
- “affordable seo philadelphia” — **position 17**
- “local seo service philadelphia” — **position 27**
- “philadelphia local seo company” — **position 30**
- “website designers philadelphia” — **position 38**

These are all landing on `/seo` or `/`. Tightening intent-match and internal linking on `/seo` is where the fastest movement will come. Head terms (“web design philadelphia” — position 98) are a 6–12 month target.

### E. URL/intent mismatch is costing commercial queries

Keyword Gap showed **`small business website design philadelphia`** ranking to your **blog guide** while competitors rank **service/home URLs**. That usually **caps** commercial performance because Google picks the URL that best matches transactional intent.

**Progress:** Blog templates now push readers (and crawl paths) to **`/web-design`** via **`views/blog-post.ejs`** and **`views/partials/blog-related-services.ejs`**. Still monitor GSC for whether the **guide URL** remains the top URL for that query; if so, tighten guide title/intro emphasis toward *informational* and add more in-content links to **`/web-design`**.

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

**Decision (shipped):** **`/`** = brand + umbrella (hand-coded sites + SEO positioning, service-area clarity). **`/web-design`** = **primary Philadelphia web-design services hub** (title, meta, H1 aligned to that intent). Reinforce with internal links from homepage sections, portfolio, and blog CTAs.

Define **one canonical money URL** per cluster and stop splitting equity across near-duplicates:

- **Philadelphia web design hub** — **`/web-design`** (see decision above); homepage supports discovery without duplicating the head-keyword H1
- **`/seo`** as the **SEO services** owner (not the blog, not TOS)
- **Industry pages** (`/contractor-web-design`, `/venue-web-design`, `/ecommerce-web-design`, etc.) as owners for industry modifiers
- **Neighborhood pages** as **child pages** that feed the hub (internal links up), not competing hubs

### Fix the known mismatch (commercial vs blog)

For queries like **small business website design Philadelphia**:

- Create or strengthen a **commercial landing experience** (service page or expanded homepage section) that matches transactional intent. — **`/web-design`** is the designated commercial hub; keep strengthening it vs the guide in GSC.
- Keep the **guide** as supporting content, but **down-rank its eligibility** for money terms by adjusting emphasis, title framing, internal links, and on-page focus—**without** removing the guide’s value for informational queries. — **In progress:** blog templates now link prominently to **`/web-design`**; revisit guide H1/title if GSC still prefers the blog URL for transactional queries.

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

- **Philadelphia hub** content: what you do, who it’s for, neighborhoods served, proof, objections (WordPress vs hand-coded), timelines — **in progress:** IA + hub page + homepage split **shipped**; continue deepening copy and proof on **`/web-design`**
- **`/seo` overhaul** into a credible service page: audits, tracking, local SEO scope, reporting cadence, what you won’t promise, example deliverables — **head tags / snippet copy still flagged** (remove `#1` claims in **`public/seo.html`** meta + OG)
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
6. **Structured data**: fix errors first on **`ProfessionalService` / `Service`** (as on `home.html`), **WebSite**, **BreadcrumbList**, **FAQ** (if deployed); validate in Rich Results Test after changes

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
- Rebalance internal linking: **hub → industry → case studies → contact** — **partially done:** hub differentiation, homepage → hub paths, blog CTAs to **`/web-design`**; keep tightening industry + neighborhood pages upward to hub
- Begin **`/seo` credibility rewrite** + proof modules (supports selling SEO ethically) — **meta/OG still open** (`#1` language in `seo.html` descriptions); body copy may already be stronger—align head with page

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

*Document generated from the agreed audit and strategy. Update the **Implementation status** table and “Last reviewed” date when you ship changes. Update KPIs as execution progresses.*
