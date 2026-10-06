const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const statusPill = document.getElementById('statusPill');
const demoForm = document.getElementById('demoForm');
const welcomeMessage = document.getElementById('welcomeMessage');
const nameInput = document.getElementById('nameInput');
const countValue = document.getElementById('countValue');
const counterMessage = document.getElementById('counterMessage');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');

let count = 0;

function updateCounterText() {
  countValue.textContent = count;

  if (count === 0) {
    counterMessage.textContent = 'The counter is at zero.';
  } else if (count > 0) {
    counterMessage.textContent = `The counter is increasing: ${count}.`;
  } else {
    counterMessage.textContent = `The counter is decreasing: ${count}.`;
  }
}

function setTheme(isDark) {
  body.classList.toggle('dark', isDark);
  themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  statusPill.textContent = isDark ? 'Dark' : 'Ready';
}

function handleFormSubmit(event) {
  event.preventDefault();
  const trimmedName = nameInput.value.trim();

  if (!trimmedName) {
    welcomeMessage.textContent = 'Please enter a name first.';
    nameInput.focus();
    return;
  }

  welcomeMessage.textContent = `Hello, ${trimmedName}! Your form works.`;
  statusPill.textContent = 'Submitted';
}

incrementBtn.addEventListener('click', () => {
  count += 1;
  updateCounterText();
});

decrementBtn.addEventListener('click', () => {
  count -= 1;
  updateCounterText();
});

demoForm.addEventListener('submit', handleFormSubmit);

themeToggle.addEventListener('click', () => {
  const isDark = !body.classList.contains('dark');
  setTheme(isDark);
});

setTheme(false);
updateCounterText();
