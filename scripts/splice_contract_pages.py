"""Splice generated contract pages into contract-template.html."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "public" / "contract-template.html"
PAGES = ROOT / ".tmp_contract_pages.html"


def main() -> None:
    template = TEMPLATE.read_text(encoding="utf-8")
    pages = PAGES.read_text(encoding="utf-8")

    start = template.index("            <!-- Page Container -->")
    pc_start = template.index('<div class="page-container">', start)
    inner_start = pc_start + len('<div class="page-container">')
    marker = '        <div id="form-message"'
    end = template.index(marker)

    before = template[:inner_start]
    after = template[end:]
    new_html = before + "\n" + pages + "        </div>\n" + after

    old_goto = """        function goToSignatures() {
            // Go to last page (page 7) and scroll to the submit button at the bottom
            const lastPage = totalPages;
            if (currentPage === lastPage) {
                // Already on last page, just scroll to submit
                const submitBlock = document.querySelector('.contract-page[data-page="7"] .submit-block');
                if (submitBlock) submitBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            document.querySelector(`.contract-page[data-page="${currentPage}"]`).classList.remove('active');
            currentPage = lastPage;
            document.querySelector(`.contract-page[data-page="${currentPage}"]`).classList.add('active');
            updateNavigation();
            setTimeout(() => {
                const submitBlock = document.querySelector('.contract-page[data-page="7"] .submit-block');
                if (submitBlock) submitBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }"""

    new_goto = """        function goToSignatures() {
            // Go to last page and scroll to the submit button at the bottom
            const lastPage = totalPages;
            if (currentPage === lastPage) {
                const submitBlock = document.querySelector(`.contract-page[data-page="${lastPage}"] .submit-block`);
                if (submitBlock) submitBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            document.querySelector(`.contract-page[data-page="${currentPage}"]`).classList.remove('active');
            currentPage = lastPage;
            document.querySelector(`.contract-page[data-page="${currentPage}"]`).classList.add('active');
            updateNavigation();
            setTimeout(() => {
                const submitBlock = document.querySelector(`.contract-page[data-page="${lastPage}"] .submit-block`);
                if (submitBlock) submitBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }"""

    if old_goto in new_html:
        new_html = new_html.replace(old_goto, new_goto)
    else:
        # Fallback: replace hardcoded data-page="7" submit lookups in goToSignatures
        new_html = new_html.replace(
            "document.querySelector('.contract-page[data-page=\"7\"] .submit-block')",
            "document.querySelector(`.contract-page[data-page=\"${lastPage}\"] .submit-block`)",
        )

    new_html = new_html.replace(
        "subject to the terms of Section 2.5 herein.",
        "subject to the terms of Section 3 herein.",
    )
    new_html = new_html.replace(
        "let frequencyText = 'continuing thereafter on the first day of each month during the term of this Agreement. subject to the terms of Section 2.5 herein.';",
        "let frequencyText = 'continuing thereafter on the first day of each month during the Term';",
    )
    new_html = new_html.replace(
        "Complete and sign your website development contract with Fishtown Web Design. Start your web design subscription today.",
        "Review and sign the Fishtown Web Design website design, development, hosting, and maintenance agreement.",
    )
    new_html = new_html.replace(
        "<title>Website Development Contract | Fishtown Web Design</title>",
        "<title>Website Design and Hosting Agreement | Fishtown Web Design</title>",
    )
    new_html = new_html.replace(
        'content="Website Development Contract | Fishtown Web Design"',
        'content="Website Design and Hosting Agreement | Fishtown Web Design"',
    )

    TEMPLATE.write_text(new_html, encoding="utf-8")
    print(f"Updated {TEMPLATE}")
    print("Pages:", len(re.findall(r'class="contract-page', new_html)))
    print("Kill Fee:", "Kill Fee" in new_html)
    print("AI Training:", "Prohibition on AI Training" in new_html)
    print("Philadelphia County:", "Philadelphia County" in new_html)
    print("Managing Member:", "Managing Member" in new_html)
    print("Alpha Version leftover:", "Alpha Version" in new_html)
    print("Lancaster leftover:", "County of Lancaster" in new_html)


if __name__ == "__main__":
    main()
