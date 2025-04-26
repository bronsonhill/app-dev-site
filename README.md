# App Business Website

A simple, modern static website built with Vite and Tailwind CSS. Easily deployable to Netlify, GitHub Pages, or any static hosting platform.

## Getting Started

### Prerequisites

- Node.js (>=14)
- npm

### Install Dependencies

```bash
npm install
```

### Development

To start the Vite development server:
```bash
npm run dev
```
Open http://localhost:5173 to view.

To start the Netlify Dev server (includes Netlify Functions proxy):
```bash
npm start
```

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

### Deploying

#### Netlify

- Connect this repo to Netlify
- Set build command to `npm run build`
- Set publish directory to `dist`
- In Netlify Dashboard > Site settings > Build & deploy > Environment, add an environment variable named `OPENAI_API_KEY` with your OpenAI API key.
  - In Netlify Dashboard  Site settings  Build & deploy  Environment, add an environment variable named `OPENAI_API_KEY` with your OpenAI API key.

#### GitHub Pages

- Push to main branch
- Enable GitHub Pages (via a GitHub Action or branch deploy)
