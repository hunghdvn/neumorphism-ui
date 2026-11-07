// Form demos: show what a submit would send instead of leaving the page.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.closest('.demo')) return;
  event.preventDefault();
  const output = form.querySelector('output');
  if (output) output.textContent = JSON.stringify([...new FormData(form)]);
});
