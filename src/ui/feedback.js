/**
 * @file In-page feedback: a transient toast and a confirmation dialog built on
 * `<dialog>` (the project never uses alert/confirm/prompt).
 */

/** How long a toast stays visible, in milliseconds. */
export const TOAST_DURATION = 2800;

/**
 * Shows a short message in the page's toast area (`#toast`).
 *
 * @param {Document} doc - The document.
 * @param {string} message - Spanish text.
 * @returns {void}
 */
export function showToast(doc, message) {
  const toast = doc.getElementById('toast');
  if (!toast) {
    return;
  }
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  const view = doc.defaultView;
  if (view) {
    view.clearTimeout(Number(toast.dataset.timer));
    toast.dataset.timer = String(view.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.hidden = true;
    }, TOAST_DURATION));
  }
} // End of function showToast()

/**
 * Asks for confirmation with the page's `#confirm-dialog`.
 *
 * @param {Document} doc - The document.
 * @param {{title: string, message: string, confirmLabel: string, cancelLabel: string}} texts - Spanish texts.
 * @returns {Promise<boolean>} True when the user confirms; false on cancel, Esc or a missing dialog.
 */
export function confirmDialog(doc, texts) {
  const dialog = doc.getElementById('confirm-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    return Promise.resolve(false);
  }
  dialog.querySelector('[data-role="title"]').textContent = texts.title;
  dialog.querySelector('[data-role="message"]').textContent = texts.message;
  dialog.querySelector('[data-role="confirm"]').textContent = texts.confirmLabel;
  dialog.querySelector('[data-role="cancel"]').textContent = texts.cancelLabel;
  dialog.returnValue = '';
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
    dialog.querySelector('[data-role="cancel"]').focus();
  });
} // End of function confirmDialog()
