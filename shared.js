/* shared.js — injects nav and footer into every inner page */

const NAV_HTML = `
<nav>
  <div class="logo">
    <span class="logo-name">Samayak<span>🌿</span></span>
    <span class="logo-sub">Your CampusMitra</span>
  </div>
  <ul class="nav-links">
    <li><a href="../index.html">Home</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="features.html">Features</a></li>
    <li><a href="faculty.html">Faculty</a></li>
    <li><a href="student.html">Student</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a href="login.html" class="btn-login">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
    Login / Portal
  </a>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="logo-name">Samayak<span>🌿</span></div>
      <span class="logo-sub">Your CampusMitra</span>
      <p>A centralized academic management portal bridging faculty and students in one secure digital space.</p>
    </div>
    <div class="footer-col">
      <h4>Quick Links</h4>
      <ul>
        <li><a href="../index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="features.html">Features</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Portals</h4>
      <ul>
        <li><a href="faculty.html">Faculty Module</a></li>
        <li><a href="student.html">Student Module</a></li>
        <li><a href="login.html">Login</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Department</h4>
      <ul>
        <li><a href="#">CSIT Department</a></li>
        <li><a href="#">Batch 2024–2028</a></li>
        <li><a href="#">CSIT-1 Section</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2024 Samayak – Your CampusMitra. All rights reserved.</span>
    <span>Smart Campus. Better Tomorrow. 🌿</span>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', () => {
  // Inject nav
  const navTarget = document.getElementById('nav-placeholder');
  if (navTarget) navTarget.outerHTML = NAV_HTML;

  // Inject footer
  const footerTarget = document.getElementById('footer-placeholder');
  if (footerTarget) footerTarget.outerHTML = FOOTER_HTML;

  // Mark active nav link
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPage ||
        a.getAttribute('href') === './' + currentPage) {
      a.classList.add('active');
    }
  });
});
