// Theme Toggle & Preference Storage
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const htmlRoot = document.documentElement;

// Load saved preference or default to light
const savedTheme = localStorage.getItem('crosstalks-theme') || 'light';
htmlRoot.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = htmlRoot.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  htmlRoot.setAttribute('data-theme', newTheme);
  localStorage.setItem('crosstalks-theme', newTheme);
  themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});