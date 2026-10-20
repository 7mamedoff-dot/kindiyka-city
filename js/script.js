(() => {
  "use strict";

  const countdown = document.querySelector(".countdown");
  const label = document.querySelector("#countdown-label");
  const start = document.querySelector("#tournament-start");
  if (!countdown || !label || !start) return;

  const units = ["days", "hours", "minutes", "seconds"].map((id) =>
    countdown.querySelector(`#${id}`),
  );
  if (units.some((unit) => !unit)) return;

  
  const startsAt = Date.parse(start.dateTime);
  if (!Number.isFinite(startsAt)) {
    units.forEach((unit) => {
      unit.textContent = "—";
    });
    label.textContent = "ДАТУ ТУРНІРУ УТОЧНЮЄМО";
    return;
  }

  let interval;

  function updateCountdown() {
    const remaining = Math.max(0, Math.ceil((startsAt - Date.now()) / 1000));
    const values = [
      Math.floor(remaining / 86400),
      Math.floor((remaining % 86400) / 3600),
      Math.floor((remaining % 3600) / 60),
      remaining % 60,
    ];

    units.forEach((unit, index) => {
      const value = String(values[index]).padStart(2, "0");
      if (unit.textContent !== value) unit.textContent = value;
    });

    if (remaining === 0) {
      label.textContent = "ТУРНІР УЖЕ РОЗПОЧАВСЯ";
      window.clearInterval(interval);
      return false;
    }
    return true;
  }

  if (updateCountdown()) interval = window.setInterval(updateCountdown, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateCountdown();
  });
})();

(() => {
  "use strict";

  const dialog = document.querySelector("#cart-dialog");
  const items = document.querySelector("#cart-items");
  const count = document.querySelector("#cart-count");
  const total = document.querySelector("#cart-total");
  const trigger = document.querySelector(".cart-trigger");
  const close = document.querySelector("#cart-close");
  const clear = document.querySelector("#cart-clear");
  const toast = document.querySelector("#toast");

  if (!dialog || !items || !count || !total || !trigger || !close || !clear) {
    return;
  }

  const storageKey = "kindiyka-city:demo-cart:v1";
  const maxQuantity = 99;
  const products = new Map();
  const cart = new Map();
  const currency = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  });
  let toastTimeout;

  document.querySelectorAll(".product-button[data-product]").forEach((button) => {
    const card = button.closest(".product-card");
    const name = card?.querySelector("h3")?.textContent.trim();
    const price = Number(
      card?.querySelector(".product-info > strong")?.textContent.replace(/\D/g, ""),
    );
    const id = button.dataset.product;

    if (!id || !name || !Number.isSafeInteger(price) || price <= 0) return;

    products.set(id, { name, price });
    button.addEventListener("click", () => {
      const quantity = cart.get(id) || 0;
      if (quantity >= maxQuantity) {
        notify(`Максимум ${maxQuantity} одиниць одного товару.`);
        return;
      }
      cart.set(id, quantity + 1);
      saveCart();
      renderCart();
      notify(`${name} — додано в кошик.`);
    });
  });

  function notify(message) {
    if (!toast) return;
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2500);
  }

  function saveCart() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...cart]));
    } catch {
    }
  }

  function restoreCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(saved)) return;
      saved.forEach((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2) return;
        const [id, quantity] = entry;
        if (
          products.has(id) &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= maxQuantity
        ) {
          cart.set(id, quantity);
        }
      });
    } catch {
    }
  }

  function quantityButton(id, action, label, symbol) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.product = id;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    return button;
  }

  function renderCart() {
    const focused = items.contains(document.activeElement)
      ? document.activeElement.dataset
      : null;
    const rows = document.createDocumentFragment();
    let itemCount = 0;
    let amount = 0;

    cart.forEach((quantity, id) => {
      const product = products.get(id);
      itemCount += quantity;
      amount += product.price * quantity;

      const row = document.createElement("div");
      row.className = "cart-item";
      const description = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = product.name;
      const price = document.createElement("p");
      price.textContent = `${currency.format(product.price)} × ${quantity} = ${currency.format(product.price * quantity)}`;
      description.append(title, price);

      const controls = document.createElement("div");
      controls.className = "quantity-controls";
      const decrease = quantityButton(
        id,
        "decrease",
        quantity === 1
          ? `Прибрати ${product.name} з кошика`
          : `Зменшити кількість: ${product.name}`,
        "−",
      );
      const quantityText = document.createElement("span");
      quantityText.textContent = quantity;
      quantityText.setAttribute("aria-label", `Кількість: ${quantity}`);
      const increase = quantityButton(
        id,
        "increase",
        `Збільшити кількість: ${product.name}`,
        "+",
      );
      increase.disabled = quantity >= maxQuantity;
      controls.append(decrease, quantityText, increase);
      row.append(description, controls);
      rows.append(row);
    });

    if (cart.size === 0) {
      const empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = "кошик поки порожній. Додай речі з нашої колекції.";
      rows.append(empty);
    }

    items.replaceChildren(rows);
    count.textContent = itemCount;
    total.textContent = currency.format(amount);
    trigger.setAttribute("aria-label", `Відкрити кошик, товарів: ${itemCount}`);
    clear.disabled = cart.size === 0;

    if (focused) {
      const controls = [...items.querySelectorAll("button")];
      const next = controls.find(
        (button) =>
          button.dataset.product === focused.product &&
          button.dataset.action === focused.action &&
          !button.disabled,
      );
      (next || controls[0] || close).focus();
    }
  }

  items.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || !items.contains(button)) return;
    const id = button.dataset.product;
    const quantity = cart.get(id);
    if (!quantity) return;

    if (button.dataset.action === "increase" && quantity < maxQuantity) {
      cart.set(id, quantity + 1);
    } else if (button.dataset.action === "decrease") {
      if (quantity === 1) cart.delete(id);
      else cart.set(id, quantity - 1);
    } else {
      return;
    }

    saveCart();
    renderCart();
  });

  trigger.addEventListener("click", () => {
    if (!dialog.open) dialog.showModal();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => trigger.focus());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
  });
  clear.addEventListener("click", () => {
    cart.clear();
    saveCart();
    renderCart();
    close.focus();
    notify("кошик очищено.");
  });

  total.setAttribute("aria-live", "polite");
  restoreCart();
  renderCart();
})();

(() => {
  "use strict";

  if (typeof Element.prototype.animate !== "function") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll(".faq-list details").forEach((details) => {
    const summary = details.querySelector("summary");
    if (!summary) return;

    let animation;
    let expanded = details.open;
    let originalOverflow;

    function finish() {
      if (!animation) return;
      const current = animation;
      animation = null;
      details.open = expanded;
      current.cancel();
      details.style.overflow = originalOverflow;
    }

    summary.addEventListener("click", (event) => {
      if (event.defaultPrevented || reducedMotion.matches) return;
      event.preventDefault();

      const startHeight = details.getBoundingClientRect().height;
      if (!animation) {
        expanded = details.open;
        originalOverflow = details.style.overflow;
      }
      expanded = !expanded;
      animation?.cancel();

      details.open = expanded;
      const endHeight = details.getBoundingClientRect().height;
      details.open = true;
      details.style.overflow = "hidden";

      const current = details.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 260, easing: "ease-in-out", fill: "both" },
      );
      animation = current;
      current.onfinish = () => {
        if (animation === current) finish();
      };
    });

    window.addEventListener("resize", finish);
    reducedMotion.addEventListener("change", finish);
  });
})();
