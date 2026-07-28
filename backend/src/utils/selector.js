const getSelectorCode = `
function getSelector(el) {
  if (!el) return '';
  if (['HTML', 'BODY'].includes(el.tagName)) return '';
  const listItemDataLabel = el.tagName === 'LI' && el.getAttribute && el.getAttribute('data-label');
  if (listItemDataLabel) return 'li[data-label="' + listItemDataLabel + '"]';
  const inputType = el.getAttribute && el.getAttribute('type');
  const inputName = el.getAttribute && el.getAttribute('name');
  const inputValue = el.getAttribute && el.getAttribute('value');
  if (el.tagName === 'INPUT' && (inputType === 'radio' || inputType === 'checkbox') && inputName && inputValue && inputValue !== 'on') {
    return 'input[name="' + inputName + '"][value="' + inputValue + '"]';
  }
  if (el.id) return '#' + el.id;
  const testId = el.getAttribute && el.getAttribute('data-testid');
  if (testId) return '[data-testid="' + testId + '"]';
  const dataTest = el.getAttribute && el.getAttribute('data-test');
  if (dataTest) return '[data-test="' + dataTest + '"]';
  const dataLabel = el.getAttribute && el.getAttribute('data-label');
  if (dataLabel) return '[data-label="' + dataLabel + '"]';
  const aria = el.getAttribute && el.getAttribute('aria-label');
  if (aria) return '[aria-label="' + aria + '"]';
  if (el.name) return '[name="' + el.name + '"]';
  const role = el.getAttribute && el.getAttribute('role');
  const text = el.innerText && el.innerText.trim();
  if (role && text && text.length < 50) return 'role=' + role + '[name="' + text + '"]';
  if (text && text.length > 0 && text.length < 50) return 'text=' + text;
  return getCssPath(el);
}
`;

module.exports = { getSelectorCode };
