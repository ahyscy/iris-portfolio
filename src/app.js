import { profile } from "./data.js";
import { translations } from "./translations.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const savedLanguage = localStorage.getItem("iris-language");
let language = savedLanguage === "zh" ? "zh" : "en";
const toggle = $("#language-toggle");
const menuToggle = $("#menu-toggle");
const nav = $(".nav");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setLanguage(next) {
  language = next;
  document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  $$('[data-i18n]').forEach((node) => {
    const value = translations[next][node.dataset.i18n];
    if (value) node.textContent = value;
  });
  $$('[data-i18n-html]').forEach((node) => {
    const value = translations[next][node.dataset.i18nHtml];
    if (value) node.innerHTML = value;
  });
  $$('[data-profile]').forEach((node) => {
    if (next === "en" && profile[node.dataset.profile]) {
      const value = profile[node.dataset.profile];
      node.textContent = node.dataset.profile === "educationStatus" ? `EDUCATION · ${value.toUpperCase()}` : value;
    }
  });
  toggle.innerHTML = next === "en" ? '中 <span>/</span> EN' : '中 <span>/</span> EN';
  toggle.setAttribute("aria-label", next === "en" ? "切换为中文" : "Switch to English");
  localStorage.setItem("iris-language", next);
}

toggle.addEventListener("click", () => setLanguage(language === "en" ? "zh" : "en"));
setLanguage(language);
$("#year").textContent = new Date().getFullYear();

const emailLink = $("[data-profile-email]");
emailLink.href = `mailto:${profile.email}`;
$("[data-profile-email-text]").textContent = profile.email;
const socialKeys = ["linkedin", "github"];
let visibleSocialLinks = 0;
socialKeys.forEach((key) => {
  const links = $$(`[data-profile-link="${key}"]`);
  const value = profile[key];
  if (!value) { links.forEach((link) => link.remove()); return; }
  links.forEach((link) => {
    link.href = value;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.hidden = false;
  });
  visibleSocialLinks++;
});
if (visibleSocialLinks) $("#social-links-note").remove();

menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  nav.classList.toggle("nav-open", open);
});
$$('.nav a, .header-contact').forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("nav-open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

if (!reducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.13 });
  $$('.section, .project-card, .experience-card').forEach((node) => {
    node.classList.add("reveal");
    observer.observe(node);
  });
}

const orb = $("#orb-stage");
if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let frame = 0;
  orb.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const rect = orb.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      orb.style.setProperty("--pointer-x", `${x * 13}px`);
      orb.style.setProperty("--pointer-y", `${y * 13}px`);
    });
  });
  orb.addEventListener("pointerleave", () => {
    orb.style.setProperty("--pointer-x", "0px");
    orb.style.setProperty("--pointer-y", "0px");
  });
}
