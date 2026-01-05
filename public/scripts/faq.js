const faqButtons = Array.from(document.querySelectorAll('.cs-faq-item .cs-button'));
        for (const button of faqButtons) {
            const onClick = (e) => {
                e.preventDefault();
                const faqItem = button.closest('.cs-faq-item');
                if (faqItem) {
                    faqItem.classList.toggle('active');
                }
            }
            button.addEventListener('click', onClick);
        }

        class FAQFilter {
        filtersSelector = '.cs-category-button'
        FAQselector = '.cs-faq-group'
        activeClass = 'cs-active'
        hiddenClass = 'cs-hidden'

        constructor() {
            const $filters = document.querySelectorAll(this.filtersSelector)
            this.$activeFilter = $filters[0]
            this.$faqGroups = document.querySelectorAll(this.FAQselector)

            if (this.$activeFilter) {
                this.$activeFilter.classList.add(this.activeClass)
            }

            for (const $filter of $filters) {
            $filter.addEventListener('click', () => this.onClick($filter))
            }
        }

        onClick($filter) {
            this.filter($filter.dataset.filter)

            const { activeClass } = this

            if (this.$activeFilter) {
                this.$activeFilter.classList.remove(activeClass)
            }
            $filter.classList.add(activeClass)

            this.$activeFilter = $filter
        }

        filter(filter) {
            const showAll = filter == 'all'
            const { hiddenClass } = this

            for (const $faqGroup of this.$faqGroups) {
            const show = showAll || $faqGroup.dataset.category == filter
            $faqGroup.classList.toggle(hiddenClass, !show)
            }
        }
        }

        new FAQFilter()
                                

