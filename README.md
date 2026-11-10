# Iris — Personal Portfolio

A responsive, bilingual personal portfolio with a warm editorial visual system, CSS glass-orb hero, and two self-contained project demos. The palette pairs warm paper and soft blue surfaces with navy typography and a restrained terracotta accent. Manrope and Inter are loaded when available, with system font fallbacks. It uses plain HTML, CSS, and JavaScript: no build step, package manager, paid API, API key, or backend is required.

## Run locally

Python 3 is enough. From this folder, run:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Stop the server with `Ctrl+C`.

## Update personal information

Edit `src/data.js` for the name, email, location, education, EF role and dates, LinkedIn URL, and GitHub URL. The supplied email is wired as a `mailto:` link. The configured LinkedIn link appears in the contact section and footer and opens in a new tab. GitHub stays hidden until a URL is provided. English and Chinese presentation copy lives in `src/translations.js`.

## Project demos

- **AI-Powered Market Research Workflow:** `./projects/market-research.html` (published at `/iris-portfolio/projects/market-research.html`). Create and reopen multiple research projects, follow an adaptive bilingual research checklist, manage manually collected sources, generate and edit an English prompt for external AI tools, edit a report template, and export prompt and report files. Projects are saved in browser localStorage. It does not scrape the web, verify sources, or call an AI service.
- **Sales analysis dashboard:** `./projects/sales-dashboard.html` (published at `/iris-portfolio/projects/sales-dashboard.html`). Loads the clearly synthetic `projects/sample-sales.csv` by default and accepts local CSV uploads up to 2 MB. Required headers are `order_id,date,product,quantity,unit_price`; quoted CSV values, including commas and doubled quotes, are supported. Dates use `YYYY-MM-DD`; quantity must be a positive whole number; unit price must be non-negative. One row is a line item; repeated order IDs count once. Start/end date filters update all dashboard views, and filtered records can be exported as UTF-8 CSV. Revenue is quantity × unit price, and currency is not inferred. Uploaded files are parsed in the browser and are not sent to a server. Monthly observations describe recorded data and are not predictions.

Both demos have project case studies, including their objectives, workflow, tools, outputs, and limitations.

## Publish online

This is a static website. For the configured GitHub Pages repository source, publish the `main` branch from the repository root (`/`). There is no build command or output directory. Internal asset and page links are relative so they work both at the local root and under the GitHub Pages repository path. The expected public URL is `https://ahyscy.github.io/iris-portfolio/`.

## Project status

The portfolio is built as a static site. The education entry is marked graduated with the supplied period. Market research uses only manually entered notes and source leads. The dashboard’s bundled figures are synthetic examples, not real business results.
