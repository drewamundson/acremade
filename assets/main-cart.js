class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('main-cart').updateQuantity(this.dataset.index, 0, this.id);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class MainCart extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById(
      'shopping-cart-line-item-status'
    );

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnQuantityChange = debounce((event) => {
      this.onQuantityChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnQuantityChange.bind(this));
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart',
        sectionId: document.getElementById('main-cart').dataset.id,
      },
      {
        id: 'main-cart-footer',
        sectionId: document.getElementById('main-cart-footer').dataset.id,
      },
    ];
  }

  reflectUpdateState(updating = false, line = null) {
    document.querySelectorAll('.reflects-update-state').forEach((el) => {
      el.classList.toggle('reflects-update-state--state-is-updating', updating);
    });

    if (line) {
      document
        .querySelector(`[data-cart-row-at-index="${line}"].updatable`)
        ?.classList.toggle('updatable--is-updating', updating);
    } else if (updating == false) {
      document.querySelectorAll('.updatable').forEach((el) => {
        el.classList.toggle('updatable--is-updating', updating);
      });
    }
  }

  onQuantityChange(event) {
    const idToFocus = document.activeElement.id || event.target.id;

    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      idToFocus
    );
  }

  updateQuantity(line, quantity, idToFocus) {
    this.lineItemStatusElement.setAttribute('aria-hidden', false);

    this.reflectUpdateState(true, line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: [
        'cart-live-region-text',
        ...this.getSectionsToRender().map((section) => section.sectionId),
      ],
      sections_url: window.location.pathname,
    });

    document.getElementById('cart-errors').textContent = '';

    fetch(`${window.theme.routes.cart_change_url.replace('.js', '')}`, {
      ...{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
      ...{ body },
    })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);

        this.classList.toggle('is-empty', parsedState.item_count === 0);

        document
          .getElementById('main-cart-footer')
          ?.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elToReplace = document
            .getElementById(section.id)
            .querySelector('[data-updatable-region]');

          const updatedElHTML = new DOMParser()
            .parseFromString(
              parsedState.sections[section.sectionId],
              'text/html'
            )
            .querySelector('[data-updatable-region]').innerHTML;

          elToReplace.innerHTML = updatedElHTML;
        });

        document.getElementById('CartCount').textContent =
          parsedState.item_count;

        document.getElementById('cart-live-region-text').innerHTML =
          new DOMParser().parseFromString(
            parsedState.sections['cart-live-region-text'],
            'text/html'
          ).firstElementChild.innerHTML;

        this.updateLiveRegions(line, parsedState.item_count);
      })
      .catch((e) => {
        console.error(e);
        this.reflectUpdateState(false);
        document.getElementById('cart-errors').textContent =
          window.theme.strings.cartError;
      })
      .finally(() => {
        window.qtySelectors();
        this.reflectUpdateState(false);
        if (idToFocus) document.getElementById(idToFocus).focus();
      });
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document
        .getElementById(`Line-item-error-${line}`)
        .querySelector('.cart-item__error-text').innerHTML =
        window.theme.strings.cartQuantityError.replace(
          '[quantity]',
          document
            .getElementById('main-cart')
            .querySelector(`[data-cart-row-at-index="${line}"]`)
            .querySelector('input[name="updates[]"]').value
        );
    }

    this.currentItemCount = itemCount;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }
}

customElements.define('main-cart', MainCart);
