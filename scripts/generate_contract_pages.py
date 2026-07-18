"""Generate contract-page HTML fragments from the updated agreement text."""

from __future__ import annotations

from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / ".tmp_contract_pages.html"


def esc(text: str) -> str:
    return escape(text, quote=False)


def p(text: str) -> str:
    return f"<p>{esc(text)}</p>"


def h3(title: str) -> str:
    return f'<h3 class="article-title">{esc(title)}</h3>'


def article(title: str, body: str) -> str:
    return f"""
                <div class="article">
                    {h3(title)}
                    <div class="article-content">
{body}
                    </div>
                </div>"""


def page(num: int, active: bool, content: str) -> str:
    active_cls = " active" if active else ""
    return f"""
            <!-- Page {num} -->
            <div class="contract-page{active_cls}" data-page="{num}">
{content}
            </div>
"""


COVER = r'''
                <h1 class="cover-title">WEBSITE DESIGN, DEVELOPMENT, HOSTING &amp; MAINTENANCE AGREEMENT</h1>
                <p class="contract-subtitle" style="text-align:center;margin:-0.5rem 0 1.5rem;color:var(--text-body);font-size:0.9375rem;">Cover Sheet</p>

                <div class="cover-field">
                    <label class="cover-label">Designer</label>
                    <input type="text" class="cover-input" value="Fishtown Web Design LLC, a Pennsylvania limited liability company (&quot;Designer&quot;)" readonly style="background: var(--bg-secondary);">
                </div>
                <div class="cover-field">
                    <label class="cover-label">Designer Address</label>
                    <input type="text" class="cover-input" value="1046 Chestnut Street, Columbia PA, 17512" readonly style="background: var(--bg-secondary);">
                </div>
                <div class="cover-field">
                    <label class="cover-label">Designer Contact</label>
                    <input type="text" class="cover-input" value="George Seibert, Managing Member — (717) 333-8691 / help@fishtownwebdesign.com" readonly style="background: var(--bg-secondary);">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Client / Company: <span id="company-required" style="display: none; color: var(--primary);">*</span></label>
                    <input type="text" class="cover-input" id="input-company" name="business_name" placeholder="Enter company name (if applicable)" oninput="updateContractFields(); validateCompanyFields();">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Client Contact: <span class="required" style="color: var(--primary);">*</span></label>
                    <input type="text" class="cover-input" id="input-contact" name="client_name" placeholder="Enter your full name" oninput="updateContractFields()">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Client Address: <span class="required" style="color: var(--primary);">*</span></label>
                    <input type="text" class="cover-input" id="input-address" name="business_address" placeholder="Enter address" required oninput="updateContractFields()">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Client Phone: <span class="required" style="color: var(--primary);">*</span></label>
                    <input type="tel" class="cover-input" id="input-phone" name="client_phone" placeholder="(717) 555-1234" oninput="updateContractFields()">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Client E-Mail: <span class="required" style="color: var(--primary);">*</span></label>
                    <input type="email" class="cover-input" id="input-email" name="client_email" placeholder="your.email@example.com" oninput="updateContractFields()">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Company Type: <span id="company-type-required" style="display: none; color: var(--primary);">*</span></label>
                    <select class="cover-input" id="input-client-type" name="client_type" onchange="updateContractFields(); validateCompanyFields();">
                        <option value="">Select company type (if applicable)</option>
                        <option value="Limited Liability Company">Limited Liability Company</option>
                        <option value="Corporation">Corporation</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Individual">Individual</option>
                    </select>
                </div>

                <div class="cover-field">
                    <label class="cover-label">Services (the &quot;Services&quot;):</label>
                    <ul class="service-list">
                        <li>Custom, hand-coded website design and development (up to five (5) Web Pages; additional pages billed per Section 4.2)</li>
                        <li>Mobile-first, fully responsive layout across phone, tablet, and desktop</li>
                        <li>Monthly website hosting (up to 10 GB storage)</li>
                        <li>Unlimited content updates on existing pages (text, photos, and similar edits per Section 4.1)</li>
                        <li>Basic maintenance, software updates, and security updates</li>
                        <li>DNS and SSL configuration on Designer's hosting infrastructure (per Section 5.5)</li>
                    </ul>
                </div>

                <div class="cover-field">
                    <label class="cover-label">Plan Type: <span class="required" style="color: var(--primary);">*</span></label>
                    <select class="cover-input" id="plan-type" name="plan_type" onchange="updateServiceFee()">
                        <option value="">Select a plan</option>
                        <option value="monthly">Monthly - $150/month</option>
                        <option value="yearly">Yearly - $1,499/year (Save $300)</option>
                    </select>
                </div>

                <div class="cover-field">
                    <label class="cover-label">Fees (the &quot;Monthly Service Fee&quot;): (Plans are subject to the terms of Section 3 herein.)</label>
                    <input type="text" class="cover-input" id="service-fee-display" name="service_fee" value="Select a plan above" readonly style="background: var(--bg-secondary);">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Initial Term:</label>
                    <input type="text" class="cover-input" name="service_term" value="Twelve (12) months from the Effective Date, per Section 10.1" readonly style="background: var(--bg-secondary);">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Effective Date / Start Date:</label>
                    <input type="date" class="cover-input" id="start-date" name="start_date" readonly style="background: var(--bg-secondary);">
                </div>

                <div class="cover-field">
                    <label class="cover-label">Service Capacity:</label>
                    <ul class="service-list">
                        <li>Up to 10 GB storage</li>
                        <li>Usage above 10 GB will be billed at Designer's then-current standard rates, with prior written notice to Client</li>
                    </ul>
                </div>

                <div class="cover-field">
                    <label class="cover-label">Optional Add-Ons (quoted separately unless noted):</label>
                    <table class="contract-table" style="width:100%;border-collapse:collapse;font-size:0.875rem;margin-top:0.5rem;">
                        <thead>
                            <tr>
                                <th style="text-align:left;border-bottom:1px solid var(--border-medium);padding:0.5rem 0.25rem;">Add-On</th>
                                <th style="text-align:left;border-bottom:1px solid var(--border-medium);padding:0.5rem 0.25rem;">Fee</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:0.5rem 0.25rem;border-bottom:1px solid var(--border-light);">Additional Web Page (beyond the 5 included)</td>
                                <td style="padding:0.5rem 0.25rem;border-bottom:1px solid var(--border-light);">$100.00 per page (one-time)</td>
                            </tr>
                            <tr>
                                <td style="padding:0.5rem 0.25rem;border-bottom:1px solid var(--border-light);">Blog setup</td>
                                <td style="padding:0.5rem 0.25rem;border-bottom:1px solid var(--border-light);">$250.00 one-time (per Section 4.4)</td>
                            </tr>
                            <tr>
                                <td style="padding:0.5rem 0.25rem;">Additional design or development (hourly)</td>
                                <td style="padding:0.5rem 0.25rem;">$150.00 per hour (per Section 4.2)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Create contract button (page 1) -->
                <div class="submit-block" style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: 0.5rem; text-align: center;">
                    <p style="margin-bottom: 1rem; color: var(--text-body); font-size: 0.875rem;">
                        By submitting this form, you agree to the terms and conditions outlined in this contract.
                    </p>
                    <button type="submit" class="skip-button submit-button" id="submit-button" style="font-size: 1rem; padding: 1rem 2rem; min-width: 200px;">
                        Submit &amp; Sign Contract
                    </button>
                </div>
'''

SIGNATURES = r'''
                <!-- Signatures - hidden on form, shown only in DocuSeal -->
                <div class="signature-section" style="display: none; margin-top: 2rem;">
                    <div class="signature-block">
                        <p class="signature-label"><strong>DESIGNER: Fishtown Web Design LLC</strong></p>
                        <p class="signature-label">Signed:</p>
                        <div class="signature-field company-signature">
                            <img src="/public/content/contract/George Seibert.png" alt="George Seibert Signature" class="signature-image" onerror="this.style.display='none'; this.parentElement.querySelector('.signature-placeholder').style.display='block';">
                            <p class="signature-placeholder" style="display: none;">Company signature</p>
                        </div>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0.5rem;">Printed Name: George Seibert</p>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0.5rem;">Title: Managing Member</p>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0;">Date: <input type="text" class="signature-input" id="signature-date-company" name="company_signature_date" value="" readonly style="max-width: 200px; font-size: 0.875rem; padding: 0.5rem;"></p>
                    </div>

                    <div class="signature-block">
                        <p class="signature-label"><strong>CLIENT</strong></p>
                        <p class="signature-label">Signed:</p>
                        <div class="signature-field client-signature" id="client-signature-field" style="padding: 1rem; min-height: 150px; display: flex; align-items: center; justify-content: center;">
                            <signature-field
                                name="Client Signature"
                                role="First Party"
                                format="drawn_or_typed"
                                required="true"
                                style="width: 100%; max-width: 400px; min-height: 120px; border: 2px dashed var(--primary); border-radius: 0.25rem; display: block; margin: 0 auto;">
                            </signature-field>
                        </div>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0.5rem; margin-top: 1rem;">Printed Name: <span class="required" style="color: var(--primary);">*</span>
                            <text-field
                                name="Client Printed Name"
                                role="First Party"
                                required="true"
                                style="width: 200px; max-width: 200px; font-size: 0.875rem; padding: 0.5rem; border: 1px solid var(--border-medium); border-radius: 0.25rem; display: inline-block;">
                            </text-field>
                        </p>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0.5rem;">Title:
                            <text-field
                                name="Client Title"
                                role="First Party"
                                required="false"
                                style="width: 200px; max-width: 200px; font-size: 0.875rem; padding: 0.5rem; border: 1px solid var(--border-medium); border-radius: 0.25rem; display: inline-block;">
                            </text-field>
                        </p>
                        <p class="signature-label" style="font-size: 0.8125rem; margin-bottom: 0;">Date: <span class="required" style="color: var(--primary);">*</span>
                            <date-field
                                name="Client Signature Date"
                                role="First Party"
                                required="true"
                                style="width: 200px; max-width: 200px; font-size: 0.875rem; padding: 0.5rem; border: 1px solid var(--border-medium); border-radius: 0.25rem; display: inline-block;">
                            </date-field>
                        </p>
                    </div>

                    <div class="version-info">V2.0 — Website Design, Development, Hosting &amp; Maintenance Agreement</div>
                </div>

                <!-- Create contract button (last page) -->
                <div class="submit-block" style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: 0.5rem; text-align: center;">
                    <p style="margin-bottom: 1rem; color: var(--text-body); font-size: 0.875rem;">
                        By submitting this form, you agree to the terms and conditions outlined in this contract.
                    </p>
                    <button type="submit" class="skip-button submit-button" style="font-size: 1rem; padding: 1rem 2rem; min-width: 200px;">
                        Submit &amp; Sign Contract
                    </button>
                </div>
'''


def main() -> None:
    # Rebuild pages carefully without double-escaping intentional HTML
    pages_html: list[str] = []

    pages_html.append(page(1, True, COVER))

    pages_html.append(
        page(
            2,
            False,
            f"""
                <h2 class="contract-main-title">Website Design, Development, Hosting &amp; Maintenance Agreement</h2>
                <div class="contract-intro">
                    <p>THIS WEBSITE DESIGN, DEVELOPMENT, HOSTING &amp; MAINTENANCE AGREEMENT (this &quot;Agreement&quot;), dated as of <strong id="display-effective-date">{{{{EFFECTIVE_DATE}}}}</strong> (the Effective Date stated on the Cover Sheet), is entered into by and between Fishtown Web Design LLC, a Pennsylvania limited liability company (&quot;Designer&quot;), and <span id="display-client-intro">{{{{CLIENT_INTRO}}}}</span>. Designer and Client are referred to collectively as the &quot;Parties&quot; and individually as a &quot;Party.&quot;</p>
                    <p>WHEREAS, Client desires to engage Designer to design, develop, host, and maintain a custom website for Client, and Designer desires to provide such services, all on the terms and conditions set forth herein;</p>
                    <p>NOW, THEREFORE, in consideration of the mutual covenants and promises set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:</p>
                </div>
{article("1. DEFINITIONS", chr(10).join([
    p('1.1 "Business Day" means Monday through Friday, excluding federal holidays observed in the Commonwealth of Pennsylvania.'),
    p('1.2 "Client Content" means all text, copy, photographs, videos, logos, trademarks, data, and other materials provided by Client to Designer for incorporation into the Website.'),
    p('1.3 "Deliverables" means the design mockups, Website files, and any other work product delivered by Designer to Client under this Agreement.'),
    p('1.4 "Designer IP" has the meaning given in Section 7.1.'),
    p('1.5 "Bug" means a reproducible error in the Website that causes it to materially malfunction, as distinguished from a design preference, content correction, browser configuration issue, or third-party service failure.'),
    p('1.6 "Final Acceptance" means Client\'s acceptance (or deemed acceptance) of the Staging Version of the Website pursuant to Section 2.5.'),
    p('1.7 "Intellectual Property Rights" means all rights in and to patents, copyrights, trademarks, trade dress, trade names, trade secrets, know-how, and goodwill, together with all related registrations and applications for registration, whether now existing or hereafter arising, anywhere in the world.'),
]))}
""",
        )
    )

    pages_html.append(
        page(
            3,
            False,
            article(
                "1. DEFINITIONS (continued)",
                "\n".join(
                    [
                        p('1.8 "Launch" means Designer\'s publication of the final Website to Designer\'s production server such that it is publicly accessible at Client\'s Domain Name.'),
                        p('1.9 "Revision Round" means one (1) consolidated set of written change requests submitted by Client in a single communication, together with Designer\'s implementation of those requests.'),
                        p('1.10 "Staging Version" means the substantially complete Website made available by Designer for Client\'s review over the Internet at a private staging address prior to Launch.'),
                        p('1.11 "Web Page" means an individual page of the Website accessible at a distinct URL.'),
                        p('1.12 "Website" means the custom, hand-coded website designed and developed by Designer for Client under this Agreement, including all Web Pages, source code, markup, scripts, stylesheets, themes, templates, graphics, and design elements created by Designer, hosted on Designer\'s server infrastructure.'),
                        p('1.13 "Domain Name" means the internet domain name registered in Client\'s name (or in the name of an affiliate controlled by Client) and used to make the Website publicly accessible.'),
                    ]
                ),
            )
            + article(
                "2. WEBSITE DESIGN & DEVELOPMENT",
                "\n".join(
                    [
                        p("2.1 Client Questionnaire. Designer's process begins with delivery of a comprehensive questionnaire designed to gather the information required to build the Website, including desired functionality, design preferences, and content requirements. Client shall return the completed questionnaire, together with all Client Content reasonably required to begin design, within ten (10) Business Days of receipt. Designer's delivery timelines under this Section 2 do not begin to run until Designer has received the completed questionnaire and sufficient Client Content to proceed."),
                        p("2.2 Design Mockup. Within fifteen (15) Business Days after receipt of the completed questionnaire and Client Content, Designer shall use commercially reasonable efforts to deliver an initial design mockup to Client."),
                        p("2.3 Design Revisions; Hard Cap."),
                        p("(a) Revision Rounds Included. The Monthly Service Fee includes a maximum of two (2) Revision Rounds during the design phase. Additional Revision Rounds are available at Designer's hourly rate stated in Section 4.2 and will be performed only upon Client's prior written approval of the estimated cost."),
                        p("(b) Feedback Window. For each mockup or revised mockup delivered, Client shall provide all feedback in a single consolidated written communication within seven (7) days of delivery. Piecemeal, conflicting, or serial feedback submitted separately may, at Designer's discretion, be counted as separate Revision Rounds."),
                        p("(c) Deemed Approval. If Client fails to provide consolidated written feedback or written approval within fourteen (14) days of delivery of any mockup, the mockup shall be deemed approved and the design phase deemed complete."),
                        p('(d) Final Design Approval. Client shall signify approval of the final design mockup in writing (email is sufficient) ("Final Design Approval"). Final Design Approval closes the design phase; any subsequent design changes constitute Additional Services under Section 4.'),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            4,
            False,
            article(
                "2. WEBSITE DESIGN & DEVELOPMENT (continued)",
                "\n".join(
                    [
                        p("2.4 Development. Upon Final Design Approval, Designer shall develop the Website in substantial conformance with the approved design. Designer shall use commercially reasonable efforts to deliver the Staging Version for Client's review within thirty (30) days after Final Design Approval, subject to extension under Sections 2.7 and 6."),
                        p("2.5 Staging Review & Final Acceptance."),
                        p("(a) Review Window. Client shall test all aspects of the Staging Version and provide consolidated written feedback within ten (10) days of delivery."),
                        p("(b) Revision Rounds Included. The Monthly Service Fee includes a maximum of two (2) Revision Rounds during the staging review phase, limited to (i) correction of Bugs and (ii) conformance of the Website to the Final Design Approval. Requests that alter, add to, or depart from the Final Design Approval are Additional Services under Section 4."),
                        p("(c) Acceptance; Deemed Acceptance. Client shall indicate Final Acceptance in writing (email is sufficient). If Client fails to deliver either Final Acceptance or consolidated written feedback within fourteen (14) days of delivery of the Staging Version (or of any revised Staging Version), Final Acceptance shall be deemed given. CLIENT EXPRESSLY WAIVES ANY RIGHT TO REVOKE ACCEPTANCE ONCE GIVEN OR DEEMED GIVEN."),
                        p("2.6 Launch. Designer shall Launch the Website within ten (10) days after Final Acceptance, provided Client's account is current on all fees. Launch constitutes completion of the initial development phase of the Services."),
                        p("2.7 Change Orders. Any modification to the agreed scope, design, or functionality proposed by either Party prior to Final Acceptance must be documented in a writing (email is sufficient) stating the change, any additional fees, and any schedule extension, and agreed to by both Parties before Designer performs the work. All delivery deadlines shall be extended by (i) the additional development time stated in the change order and (ii) the period between the proposal of a change and its written approval where work cannot reasonably continue in the interim. No delay under this Section 2.7 shall give rise to any set-off, penalty, or liability against Designer."),
                    ]
                ),
            )
            + article(
                "3. FEES & PAYMENT",
                "\n".join(
                    [
                        '<p><strong>3.1 Monthly Service Fee.</strong> Client shall pay Designer the Monthly Service Fee of $150.00 per month, in advance. The Service Fee selected on the Cover Sheet is <span id="display-service-fee">{{SERVICE_FEE}}</span>, with payments <span id="display-payment-frequency">continuing thereafter on the first day of each month during the Term</span>.</p>',
                        p("3.2 First Payment; Proration. The first payment is due upon execution of this Agreement. If the Effective Date is the first day of a calendar month, the first payment shall be the full Monthly Service Fee of $150.00. If the Effective Date is any other day, the first payment shall be prorated for the remainder of that calendar month, calculated as $150.00 multiplied by the number of days remaining in the month (including the Effective Date) divided by the total number of days in that month."),
                        p("3.3 Recurring Payments. All subsequent Monthly Service Fees are due on the first (1st) day of each calendar month during the Term, without invoice or demand."),
                        p("3.4 Late Payment. Any amount not received within ten (10) days of its due date shall bear a late fee of $25.00 or the maximum amount permitted by law, whichever is less, per month. If any amount remains unpaid for fifteen (15) days after its due date, Designer may, upon written notice, suspend the Services (including hosting and public availability of the Website) until the account is brought current, and/or terminate this Agreement for cause under Section 10.4. Suspension does not relieve Client of its payment obligations."),
                        p("3.5 Additional Fees. Fees for Additional Services under Section 4, third-party asset costs under Section 4.8, and storage overages under the Cover Sheet shall be invoiced by Designer and are due within fifteen (15) days of invoice."),
                        p("3.6 No Refunds. Except as expressly provided in Sections 10.2 and 10.3(e), all payments made under this Agreement are non-refundable; provided, however, that Designer reserves the sole and exclusive discretion to issue refunds on a case-by-case basis."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            5,
            False,
            article(
                "4. SCOPE; INCLUDED SUPPORT; ADDITIONAL SERVICES",
                "\n".join(
                    [
                        p('4.1 Included Content Updates. After Launch, the Monthly Service Fee includes unlimited Content Updates at no additional charge. A "Content Update" means modifying, replacing, adding to, or removing text, copy, photographs, videos, logos, links, files, or similar Client Content within existing Web Pages, sections, blocks, or components of the Website as delivered at Launch (or as previously added under Section 4.2), without adding new Web Pages, new page sections, new layout structures, new functionality, or materially changing the Website\'s design or information architecture.'),
                        p("(a) Included Examples. Content Updates include, by way of example: revising paragraph or headline text; updating business hours, pricing, or contact information; replacing or adding photos within existing galleries or image slots; swapping hero or banner images; updating team bios; changing button labels; and updating link destinations on existing elements."),
                        p("(b) Excluded Examples. The following are not Content Updates and are Additional Services under Section 4.2: adding a new Web Page; adding a new section, block, or component to an existing page; restructuring or redesigning a page layout; new features, forms, integrations, or third-party services; and any work that departs from the Website structure in effect at Launch (or as last modified under Section 4.2)."),
                        p("(c) Submission; Turnaround. All Content Update requests must be submitted by email to help@fishtownwebdesign.com or by phone at (717) 333-8691. Designer will use commercially reasonable efforts to complete Content Updates within five (5) Business Days of receipt, subject to request volume and Designer workload. Designer will notify Client in writing before performing any work it reasonably classifies as Additional Services."),
                        p("(d) Reasonable Use. This benefit is subject to reasonable, good-faith use. Designer may reclassify requests that are structurally additive or submitted in abusive volume that materially impairs Designer's ability to serve other clients as Additional Services upon written notice."),
                        p('4.2 Additional Services. Work outside the scope of this Agreement — including without limitation new Web Pages beyond the initial five (5) included at Launch, new sections or blocks on existing pages, page restructuring, redesigns, new functionality, third-party integrations, and any design or development requests exceeding the included Revision Rounds — ("Additional Services") will be billed as follows:'),
                        p("(a) Additional Web Pages. Each additional Web Page beyond the five (5) included at Launch: $100.00 per page (one-time), quoted and approved in writing before work begins."),
                        p("(b) Hourly Work. All other Additional Services: $150.00 per hour. Designer shall provide a written estimate and obtain Client's written approval before performing hourly Additional Services."),
                        p("4.3 Blog Posts on Existing Blog. Blog posts published through a blog created under Section 4.4 are not treated as new Web Pages and may be added as Content Updates under Section 4.1, provided they use the existing blog layout and structure without structural modification."),
                        p("4.4 Blog. Creation of a blog is available for a one-time, non-recurring charge of $250.00."),
                        p("4.5 Bug Fixes. Designer will correct Bugs in the Website at no additional charge."),
                        p("4.6 Conformance Fixes. Designer will bring the Website into conformance with the Final Design Approval at no additional charge."),
                        p("4.7 Caching Disclaimer. Client acknowledges that Internet service providers, browsers, and content delivery networks may continue to cache prior versions of the Website after modifications are made, and agrees that Designer shall have no liability for such caching."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            6,
            False,
            article(
                "4. SCOPE (continued) — Third-Party Assets",
                "\n".join(
                    [
                        p('4.8 Third-Party Assets; Client-Paid Licenses. Client is solely responsible for the cost of premium or paid third-party assets requested by Client or required to implement Client\'s requested scope, including without limitation stock photography, stock video, stock illustrations, commercial fonts or typefaces, premium plugins or extensions, premium themes, and paid software, API, or SaaS subscriptions used in or integrated with the Website (collectively, "Third-Party Assets").'),
                        p("(a) Client Requests. If Client requests a specific Third-Party Asset by name, source, or link, or requests functionality that reasonably requires a paid license, Client shall pay the applicable license, purchase, or subscription fees."),
                        p("(b) Designer Purchase on Client's Behalf. Designer may, but is not obligated to, purchase Third-Party Assets on Client's behalf after providing Client with the item, vendor, and cost and obtaining Client's written approval. Such costs will be invoiced at cost, without markup, unless otherwise agreed in writing."),
                        p("(c) Open-Source and Free Alternatives. Unless Client directs otherwise in writing, Designer may use freely available or open-source alternatives in lieu of paid Third-Party Assets."),
                        p("(d) Renewals and Transfers. Client is responsible for ongoing renewal, maintenance, and support fees for Third-Party Assets after purchase, and for transferring or maintaining licenses if the Website is migrated away from Designer's hosting."),
                        p("(e) No Warranty. Designer does not warrant third-party vendors, licenses, or asset quality and shall have no liability arising from Client-selected or Client-requested Third-Party Assets, except to the extent caused by Designer's gross negligence in implementing an approved asset."),
                    ]
                ),
            )
            + article(
                "5. HOSTING, MAINTENANCE & BACKUPS",
                "\n".join(
                    [
                        p("5.1 Hosting. Designer shall host the Website on server infrastructure selected and managed by Designer (currently virtual machines provided by a reputable third-party cloud infrastructure provider), with storage capacity of up to 10 GB."),
                        p("5.2 Uptime. Designer shall use commercially reasonable efforts to keep the Website continuously available and targets 99.9% monthly uptime, excluding scheduled maintenance and causes described in Section 9.3. Designer does not warrant or guarantee uninterrupted availability, and Client's sole remedy for downtime is Designer's commercially reasonable efforts to restore service promptly."),
                        p('5.3 Basic Maintenance. "Basic maintenance and updates" means (i) routine updates of the software packages, libraries, and dependencies used in the Website\'s code, and (ii) routine maintenance, patching, and security updates of the Linux web server on which the Website is hosted. Basic maintenance does not include Content Updates (covered by Section 4.1), redesigns, or new development.'),
                        p('5.4 Backups. Designer maintains copies of the Website\'s code and files on Designer\'s local development systems in addition to the production server, and relies on its infrastructure provider\'s standard practices for server-level resilience. These backups are provided as a courtesy and on an "as is" basis. Client is solely responsible for retaining master copies of all Client Content, and Designer shall have no liability for loss of data that Client failed to retain.'),
                        p("5.5 Domain Name; DNS; SSL. Client shall register, own, and pay for the Domain Name and all registrar, privacy, renewal, and transfer fees. Client shall maintain valid domain registration throughout the Term. Designer will configure DNS and SSL certificate installation on Designer's hosting infrastructure at no additional charge as part of the Services, provided Client grants Designer access to the domain registrar or DNS control panel as reasonably required. Client shall not change DNS, nameservers, or registrar settings in any manner that would interfere with Designer's hosting without Designer's prior written consent during the Term."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            7,
            False,
            article(
                "6. CLIENT RESPONSIBILITIES; COOPERATION",
                "\n".join(
                    [
                        p('6.1 Point of Contact. Client shall designate one (1) individual (the "Project Manager") authorized to give feedback, approvals, and decisions binding on Client. Designer is entitled to rely on communications from the Project Manager.'),
                        p("6.2 Timely Feedback & Content. Client acknowledges that Designer's ability to meet the timelines in Section 2 depends on Client's timely cooperation. Client shall use reasonable efforts to (i) deliver all Client Content and questionnaire responses within the timeframes in Section 2.1, and (ii) respond to each Designer request for feedback, approval, or materials within seven (7) days (or such other period stated in Section 2)."),
                        p("6.3 Consequences of Delay. Every day of Client delay beyond the response periods in this Agreement extends Designer's corresponding deadlines day-for-day, and no such extension shall constitute a breach by Designer or give rise to any set-off, penalty, or liability against Designer. The deemed-approval and deemed-acceptance provisions of Sections 2.3(c) and 2.5(c) apply notwithstanding any Client delay."),
                        p("6.4 Project Dormancy. If Client fails to respond to Designer's requests for more than thirty (30) consecutive days, Designer may place the project on dormant status upon written notice. Monthly Service Fees continue to accrue during dormancy. Reactivating a dormant project may, at Designer's discretion, require a restart fee of up to $150.00 and re-queuing behind Designer's then-current workload."),
                        p("6.5 Client Content Warranties. Client represents and warrants that it owns or has all necessary rights and licenses to all Client Content, and that the Client Content and Designer's authorized use thereof will not infringe or violate any third party's Intellectual Property Rights, rights of privacy or publicity, or any applicable law. Client shall indemnify, defend, and hold harmless Designer and its members, officers, and employees from and against any claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of the Client Content or Client's breach of this Section."),
                    ]
                ),
            )
            + article(
                "7. INTELLECTUAL PROPERTY",
                "\n".join(
                    [
                        p('7.1 Designer\'s Ownership. The Parties expressly agree that the Website is not a "work made for hire" and that Designer is an independent contractor. As between the Parties, Designer is and shall remain the sole author and exclusive owner of the Website and all Deliverables — including all source code, object code, markup, scripts, stylesheets, graphics, design elements, layouts, and documentation created by Designer — and all Intellectual Property Rights therein (collectively, "Designer IP"), whether created before, during, or after the Term.'),
                        p("7.2 Client's Ownership. As between the Parties, Client is and shall remain the sole owner of (i) all Client Content, (ii) Client's Domain Name and associated URLs, and (iii) Client's trademarks, trade names, and logos, together with all Intellectual Property Rights therein. Client grants Designer a non-exclusive, royalty-free license to use, reproduce, modify, and display the Client Content solely as necessary to perform the Services."),
                        p("7.3 License to Client; Payment Condition Precedent. Subject to Section 7.4, Designer grants Client a non-exclusive, non-transferable (except as stated below), non-sublicensable, perpetual license to use, reproduce, publicly display, publicly perform, and prepare derivative works from the Designer IP embodied in the Website, solely in connection with the operation and promotion of Client's business. The license may be transferred only to a successor in connection with a sale, merger, or other transfer of substantially all of Client's business assets or equity interests, provided the successor assumes Client's obligations under this Agreement in writing. NOTWITHSTANDING ANYTHING TO THE CONTRARY, NO LICENSE, RIGHT, TITLE, OR INTEREST IN ANY DESIGNER IP, DESIGN FILES, CODE, OR OTHER DELIVERABLES SHALL VEST IN OR TRANSFER TO CLIENT UNLESS AND UNTIL ALL FEES THEN DUE AND OWING UNDER THIS AGREEMENT HAVE BEEN RECEIVED BY FISHTOWN WEB DESIGN LLC IN FULL AND HAVE FULLY CLEARED (including expiration of any applicable payment-reversal, chargeback, or dishonor period). Until such receipt and clearance, all Deliverables are licensed to Client on a limited, revocable, review-only basis."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            8,
            False,
            article(
                "7. INTELLECTUAL PROPERTY (continued)",
                "\n".join(
                    [
                        p("7.4 Suspension of License. If Client's account becomes delinquent under Section 3.4, the license in Section 7.3 is automatically suspended, and Designer may disable public access to the Website, until the account is brought current. Upon payment in full of all amounts owed, the license is reinstated."),
                        p("7.5 No Sublicense; No Resale. Client shall not sublicense, sell, lease, distribute, or otherwise commercialize the Designer IP, or any portion thereof, as a standalone product or for the benefit of any third party, except as permitted under Section 7.3 in connection with a permitted business succession."),
                        p("7.6 Prohibition on AI Training. Client shall not, and shall not permit or authorize any third party to, use the Designer IP, the Deliverables, the Website's design, code, or visual style, or any portion or derivative thereof, to train, fine-tune, ground, or otherwise develop any generative artificial intelligence model, machine learning system, style generator, or similar automated design or code-generation tool. This prohibition survives termination or expiration of this Agreement."),
                        p("7.7 Designer's Portfolio Rights. Designer may identify Client as a client and display screenshots and links to the Website in Designer's portfolio, website (fishtownwebdesign.com), and marketing materials, unless Client withdraws consent in writing."),
                        p("7.8 Data Ownership on Exit. Upon termination or expiration and payment in full of all amounts owed, Designer shall, upon Client's written request made within thirty (30) days, provide Client with an export of the Client Content and Website data in a commercially reasonable format."),
                    ]
                ),
            )
            + article(
                "8. DESIGNER WARRANTIES",
                "\n".join(
                    [
                        p("Designer represents and warrants that:"),
                        p("8.1 Authority. Designer has the right and authority to enter into this Agreement and to grant the rights granted herein."),
                        p("8.2 Good Faith. Designer shall perform the Services in good faith and in a professional and workmanlike manner."),
                        p("8.3 Original Work. The Website will be a fully custom, hand-coded creation of Designer (excepting Client Content and duly licensed third-party components such as open-source software packages), and neither Designer's work nor this Agreement will knowingly infringe any third party's Intellectual Property Rights."),
                        p("8.4 Browser Compatibility. The Website will function with current, properly configured versions of major web browsers, including Chrome, Safari, Edge, and Firefox, as of the date of Launch."),
                    ]
                ),
            )
            + article(
                "9. DISCLAIMERS; LIMITATION OF LIABILITY",
                "\n".join(
                    [
                        p('9.1 Warranty Disclaimer. EXCEPT AS EXPRESSLY STATED IN SECTION 8, THE SERVICES AND DELIVERABLES ARE PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, SYSTEM INTEGRATION, ACCURACY, NON-INFRINGEMENT, QUIET ENJOYMENT, TITLE, MARKETABILITY, PROFITABILITY, OR ANY WARRANTY ARISING FROM COURSE OF PERFORMANCE, COURSE OF DEALING, OR USAGE OF TRADE. DESIGNER DOES NOT WARRANT ANY PARTICULAR BUSINESS RESULT, SEARCH ENGINE RANKING, OR LEVEL OF TRAFFIC OR REVENUE. ANY EFFORT BY DESIGNER TO MODIFY ITS GOODS OR SERVICES SHALL NOT BE DEEMED A WAIVER OF THESE LIMITATIONS.'),
                        p("9.2 Limitation of Liability. TO THE MAXIMUM EXTENT PERMITTED BY LAW, DESIGNER SHALL NOT BE LIABLE TO CLIENT OR ANY THIRD PARTY FOR ANY LOSS OF PROFITS, LOSS OF USE, LOSS OF DATA, INTERRUPTION OF BUSINESS, OR ANY INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES OF ANY KIND, WHETHER ARISING UNDER CONTRACT, TORT, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. DESIGNER'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES ACTUALLY PAID BY CLIENT TO DESIGNER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. MODIFICATIONS MADE TO THE WEBSITE BY CLIENT OR ANY THIRD PARTY VOID ANY REMAINING EXPRESS OR IMPLIED WARRANTIES. Where applicable law does not permit certain exclusions or limitations, Designer's liability is limited to the greatest extent permitted by law."),
                        p("9.3 Force Majeure; Excused Delays. Designer shall not be liable for delays or failures in performance caused by circumstances beyond its reasonable control, including without limitation acts of God; acts of governmental authorities; fire, flood, severe weather, earthquake, or other catastrophe; epidemic or quarantine restriction; labor disputes; failures of suppliers, hosting infrastructure providers, telecommunications carriers, or transportation; equipment breakdown; or Client's delay in providing feedback, information, approvals, or materials."),
                        p("9.4 Third-Party Products & Services. Designer does not operate, control, or endorse third-party information, products, or services available on the Internet, and makes no warranty regarding, and shall have no liability arising from, Client's transactions with third parties."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            9,
            False,
            article(
                "10. TERM & TERMINATION",
                "\n".join(
                    [
                        p('10.1 Term. This Agreement begins on the Effective Date and continues for an initial term of twelve (12) months (the "Initial Term"). Upon expiration of the Initial Term, this Agreement automatically renews on a month-to-month basis (each a "Renewal Term," and together with the Initial Term, the "Term") unless either Party gives written notice of non-renewal at least thirty (30) days before the end of the Initial Term or the then-current Renewal Term.'),
                        p("10.2 Termination by Designer — No Cause. Designer may terminate this Agreement without cause upon thirty (30) days' written notice. If Designer terminates under this Section, Client shall be entitled to a pro-rata refund of the Monthly Service Fee paid for the then-current month attributable to the period after the effective termination date during which Services were not performed, and Client shall owe no early termination amounts under Section 10.3."),
                        p("10.3 Early Termination by Client; Kill Fee. Client may terminate this Agreement before the end of the Initial Term only upon written notice and payment of the amounts in this Section 10.3 (other than termination under Section 10.3(e)), which the Parties agree constitute liquidated damages reflecting a reasonable estimate of Designer's front-loaded development investment, lost hosting capacity, and reallocation costs, and not a penalty. The amounts in Sections 10.3(a) and 10.3(b) constitute an integrated liquidated damages scheme: payments made prior to termination are forfeited and credited against the Kill Fee as stated in Section 10.3(b), and are not separately refundable."),
                        p("(a) Forfeiture. All payments made by Client prior to the effective date of termination (including the initial payment made at signing) are forfeited and non-refundable, and shall be credited against the Kill Fee under Section 10.3(b) where applicable."),
                        p('(b) Kill Fee — Termination Before Launch. If Client terminates before Launch, Client shall pay a kill fee (the "Kill Fee") equal to the applicable percentage below of $1,800.00 (the aggregate Monthly Service Fees for the Initial Term), less all Monthly Service Fees already paid by Client (but in no event less than zero), plus any unpaid Additional Services fees and third-party costs incurred by Designer on Client\'s behalf:'),
                        "<ul><li>Questionnaire returned and discovery commenced: 15%</li><li>Initial design mockup delivered: 35%</li><li>Final Design Approval given or deemed given: 55%</li><li>Staging Version delivered: 85%</li><li>Final Acceptance given or deemed given: 100%</li></ul>",
                        p("(c) Early Termination Fee — Termination After Launch. If Client terminates after Launch but before the end of the Initial Term (other than under Section 10.3(e)), Client shall pay an early termination fee equal to one hundred percent (100%) of the Monthly Service Fees remaining in the Initial Term, plus any unpaid Additional Services fees and third-party costs incurred by Designer on Client's behalf."),
                        p("(d) Payment. All amounts under this Section 10.3 are due within fifteen (15) days of the effective date of termination. No Designer IP shall transfer or be licensed to Client, and Designer may take the Website offline, until such amounts are paid in full and cleared per Section 7.3."),
                        p("10.3(e) Termination by Client for Designer's Material Breach. Client may terminate this Agreement for Designer's uncured material breach upon thirty (30) days' written notice describing the breach in reasonable detail. Designer shall have thirty (30) days after receipt to cure the breach, if curable. If Designer fails to cure, termination becomes effective at the end of the cure period without further obligation under Sections 10.3(a) through (c). Upon termination under this Section, Client shall receive a pro-rata refund of prepaid Monthly Service Fees attributable to the period after the effective termination date during which material Services were not performed, and Client shall pay all amounts due for Services actually performed and Additional Services through the termination date. Client's license under Section 7.3 for the Website as delivered through the termination date continues, provided Client has paid all amounts due through that date."),
                        p("10.4 Termination by Designer — Cause. Designer may terminate this Agreement for cause if Client fails to fulfill any material obligation under this Agreement. Non-payment is subject to the notice and cure periods in Section 3.4; Designer may suspend Services under Section 3.4 and terminate for cause on account of non-payment only after the periods stated in Section 3.4 have elapsed. For any other uncured material breach, Designer may terminate immediately upon written notice. DESIGNER RESERVES THE RIGHT TO USE SELF-HELP TO THE GREATEST EXTENT PERMITTED BY LAW, INCLUDING WITHOUT LIMITATION ELECTRONIC REMEDIES SUCH AS SUSPENSION OF HOSTING."),
                        p("10.5 Effect of Termination. Upon any termination or expiration: (i) Designer retains the right to recover all accrued and unpaid charges through the date of termination, and Client waives any right of set-off; (ii) Designer may discontinue hosting and remove the Website from its servers thirty (30) days after the effective date of termination; (iii) Sections 3, 4.7, 6.5, 7, 9, 10, 11, 12, and 13 survive; and (iv) upon Client's payment in full, Section 7.8 (data export) applies."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            10,
            False,
            article(
                "11. CONFIDENTIALITY",
                "\n".join(
                    [
                        p('11.1 Definition. "Confidential Information" means non-public information disclosed by one Party to the other that is designated confidential or that reasonably should be understood to be confidential, including trade secrets, business plans, customer information, and pricing. Confidential Information does not include information that: (a) is known to the receiving Party at the time of disclosure; (b) is independently developed by the receiving Party without use of the disclosing Party\'s Confidential Information; (c) is or becomes publicly available without breach of this Agreement; (d) is publicly disclosed with the disclosing Party\'s written approval; or (e) becomes lawfully known to the receiving Party from a source without restriction. The receiving Party bears the burden of establishing any exception.'),
                        p("11.2 Obligations. Each Party shall (i) hold the other's Confidential Information in strict confidence, using at least the degree of care it uses for its own confidential information and no less than reasonable care; (ii) use such Confidential Information solely to perform its obligations under this Agreement; and (iii) not disclose it to any third party, during the Term and for two (2) years following termination or expiration, except to employees and agents who need to know it and who are bound by obligations of confidentiality."),
                        p("11.3 Compelled Disclosure. If the receiving Party is legally compelled to disclose Confidential Information, it shall, unless prohibited by law, give the disclosing Party prompt written notice so the disclosing Party may seek a protective order, and shall disclose only the portion legally required."),
                        p("11.4 Return or Destruction. Upon termination of this Agreement or the disclosing Party's request, the receiving Party shall return or destroy all Confidential Information of the disclosing Party (and certify destruction) within one (1) month."),
                        p("11.5 Injunctive Relief. Each Party acknowledges that breach of this Section 11 may cause irreparable harm for which monetary damages are inadequate, and the disclosing Party shall be entitled to seek injunctive relief in any court of competent jurisdiction without the necessity of posting bond, in addition to all other remedies."),
                    ]
                ),
            )
            + article(
                "12. DISPUTE RESOLUTION; GOVERNING LAW",
                "\n".join(
                    [
                        p("12.1 Arbitration; Small Claims Carve-Out."),
                        p('(a) Arbitration. Any dispute arising out of or relating to this Agreement that the Parties cannot resolve through good-faith negotiation within thirty (30) days shall be submitted to binding arbitration administered by, and pursuant to the rules of, the American Arbitration Association ("AAA"), conducted in Philadelphia County, Commonwealth of Pennsylvania. The Parties shall share AAA filing, administrative, and arbitrator fees equally. The arbitrator may award reasonable attorneys\' fees and costs to the prevailing party as part of the award, consistent with Section 13.6. Judgment upon any AAA award may be entered in any court having jurisdiction.'),
                        p("(b) Small Claims Carve-Out. Notwithstanding Section 12.1(a), either Party may bring an individual action in the Magisterial District Court of Philadelphia County, Pennsylvania (or any successor small-claims forum having jurisdiction), for disputes within that court's then-applicable monetary limit, and such action shall not be subject to arbitration."),
                        p("(c) Injunctive Relief. Nothing in this Section prevents either Party from seeking injunctive relief under Section 11.5 or Section 7.6 in a court of competent jurisdiction."),
                        p("12.2 Governing Law; Venue. This Agreement and its construction, validity, and performance shall be governed by, and construed in accordance with, the laws of the Commonwealth of Pennsylvania, without regard to its conflict-of-laws rules. Subject to Section 12.1, exclusive venue and jurisdiction for any permitted litigation arising out of or relating to this Agreement shall lie in the state and federal courts located in Philadelphia County, Pennsylvania, and each Party consents to the personal jurisdiction of such courts."),
                    ]
                ),
            ),
        )
    )

    pages_html.append(
        page(
            11,
            False,
            article(
                "13. GENERAL PROVISIONS",
                "\n".join(
                    [
                        p("13.1 Notices. All notices must be in writing. Delivery by email is expressly agreed to be sufficient, effective upon transmission absent a bounce or error message, to Designer at help@fishtownwebdesign.com and to Client at the email address on the Cover Sheet (or such other address as a Party designates in writing)."),
                        p("13.2 Entire Agreement; Amendment. This Agreement, including the Cover Sheet, constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior or contemporaneous agreements, whether oral, electronic, or written. This Agreement may be amended only in a writing signed (including by electronic signature) by authorized representatives of both Parties."),
                        p("13.3 Severability. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall remain in full force and effect, and the invalid provision shall be reformed to the minimum extent necessary to make it enforceable."),
                        p("13.4 Independent Contractor. Designer and its personnel, including any subcontractors and freelancers engaged by Designer, are independent contractors and not employees, agents, partners, joint venturers, or joint authors of Client. Neither Party has authority to bind the other. Designer is solely responsible for compensating its personnel and subcontractors. Each Party is responsible for its own personnel's compensation, benefits, withholdings, and taxes."),
                        p("13.5 Subcontractors; Assignment. Designer may engage subcontractors, freelancers, and other third-party personnel to perform portions of the Services without Client's prior consent, provided that Designer remains fully responsible for the overall delivery of the Services and for ensuring that such personnel are bound by confidentiality and intellectual property obligations no less protective than those in this Agreement. Designer's use of third-party hosting infrastructure, cloud providers, and standard software development tools is not a delegation requiring separate approval. Client has retained Designer as its service provider and has no direct contractual relationship with Designer's subcontractors. Neither Party may assign this Agreement without the other Party's prior written consent, except that Designer may assign this Agreement in connection with a merger, reorganization, or sale of substantially all of its assets."),
                        p("13.6 Attorneys' Fees. In any arbitration under Section 12.1 or litigation permitted under this Agreement (including enforcement of an arbitration award), the prevailing party shall be entitled to recover its costs, expenses, and reasonable attorneys' fees, to the fullest extent permitted by applicable law."),
                        p("13.7 Cumulative Remedies; No Waiver; Binding Effect. Except as otherwise provided herein, the non-breaching Party may assert all legal and equitable remedies available. A Party's failure to seek relief for any breach shall not waive its right to seek relief for any subsequent breach. This Agreement binds and inures to the benefit of the Parties and their respective successors, administrators, heirs, affiliates, and permitted assigns."),
                        p("13.8 Captions. Captions are for reference only and do not define, limit, or expand the scope of any provision."),
                        p("13.9 Counterparts; Electronic Signatures. This Agreement may be executed in counterparts, including by electronic signature, each of which is deemed an original and all of which together constitute one instrument."),
                        p("13.10 Authority. Each signatory represents that they are authorized to enter into this Agreement on behalf of their respective Party, and each Party knowingly and expressly consents to the foregoing terms and conditions."),
                    ]
                ),
            )
            + SIGNATURES,
        )
    )

    OUT.write_text("".join(pages_html), encoding="utf-8")
    print(f"Wrote {OUT} ({len(pages_html)} pages)")


if __name__ == "__main__":
    main()
