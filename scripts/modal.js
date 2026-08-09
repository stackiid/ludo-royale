"use strict";

(function () {
  const { el, icon } = window.Ludo.Utils;
  const { fadeIn, fadeOut } = window.Ludo.Animation;

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  let activeModal = null;
  let lastFocusedEl = null;

  function openModal({
    title,
    body,
    tone = "default",
    dismissible = true,
    animationsEnabled = true,
    ariaLabel = null,
  }) {
    closeModal();

    lastFocusedEl = document.activeElement;
    document.body.classList.add("scroll-locked");

    const closeBtn = el(
      "button",
      {
        className: "modal-close-btn",
        attrs: { type: "button", "aria-label": "Close dialog" },
      },
      [icon("fa-solid fa-xmark")],
    );

    const headerChildren = [
      el("h2", {
        className: "modal-title",
        text: title,
        attrs: { id: "modal-title" },
      }),
    ];
    if (dismissible) headerChildren.push(closeBtn);

    const panel = el(
      "div",
      {
        className: `modal-panel ${tone === "danger" ? "modal-danger" : ""}`,
        attrs: {
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "modal-title",
          ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        },
      },
      [
        el("div", { className: "modal-header" }, headerChildren),
        el(
          "div",
          { className: "modal-body" },
          Array.isArray(body) ? body : [body],
        ),
      ],
    );

    const overlay = el(
      "div",
      { className: "modal-overlay", attrs: { tabindex: "-1" } },
      [panel],
    );
    document.body.appendChild(overlay);

    const api = {
      el: overlay,
      close: async () => {
        await fadeOut(overlay, { enabled: animationsEnabled, duration: 180 });
        overlay.remove();
        document.body.classList.remove("scroll-locked");
        document.removeEventListener("keydown", onKeydown, true);
        if (activeModal === api) activeModal = null;
        if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();
      },
    };

    function onKeydown(evt) {
      if (evt.key === "Escape" && dismissible) {
        evt.preventDefault();
        api.close();
        return;
      }
      if (evt.key === "Tab") trapFocus(evt, panel);
    }

    if (dismissible) {
      closeBtn.addEventListener("click", () => api.close());
      overlay.addEventListener("mousedown", (evt) => {
        if (evt.target === overlay) api.close();
      });
    }

    document.addEventListener("keydown", onKeydown, true);
    activeModal = api;

    panel.setAttribute("tabindex", "-1");
    fadeIn(overlay, { enabled: animationsEnabled, duration: 220 }).then(() => {
      const firstFocusable = panel.querySelector(FOCUSABLE_SELECTOR);
      (firstFocusable || panel).focus?.();
    });

    return api;
  }

  function closeModal() {
    if (activeModal) activeModal.close();
  }

  function isModalOpen() {
    return !!activeModal;
  }

  function trapFocus(evt, panel) {
    const focusables = Array.from(
      panel.querySelectorAll(FOCUSABLE_SELECTOR),
    ).filter((n) => n.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (evt.shiftKey && document.activeElement === first) {
      evt.preventDefault();
      last.focus();
    } else if (!evt.shiftKey && document.activeElement === last) {
      evt.preventDefault();
      first.focus();
    }
  }

  /** Convenience builder for confirmation dialogs (Quit, Restart, Reset, etc.) */
  function openConfirmDialog({
    title,
    description,
    iconClass = "fa-solid fa-triangle-exclamation",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = true,
    animationsEnabled = true,
    onConfirm,
    onCancel,
  }) {
    const illustration = el("div", { className: "confirm-illustration" }, [
      icon(iconClass),
    ]);
    const desc = el("p", { className: "modal-description", text: description });

    const confirmBtn = el("button", {
      className: `btn ${danger ? "btn-danger" : "btn-primary"}`,
      attrs: { type: "button" },
    });
    confirmBtn.appendChild(document.createTextNode(confirmLabel));

    const cancelBtn = el("button", {
      className: "btn btn-ghost",
      attrs: { type: "button" },
    });
    cancelBtn.appendChild(document.createTextNode(cancelLabel));

    const actions = el("div", { className: "modal-actions" }, [
      cancelBtn,
      confirmBtn,
    ]);

    const modal = openModal({
      title,
      body: [illustration, desc, actions],
      tone: danger ? "danger" : "default",
      animationsEnabled,
    });

    confirmBtn.addEventListener("click", async () => {
      await modal.close();
      onConfirm && onConfirm();
    });
    cancelBtn.addEventListener("click", async () => {
      await modal.close();
      onCancel && onCancel();
    });

    return modal;
  }

  window.Ludo.Modal = { openModal, closeModal, isModalOpen, openConfirmDialog };
})();
