# 🚀 GitHub Push Guide — Samayak CampusMitra

## Prerequisites
- Git installed on your machine ([download](https://git-scm.com))
- A GitHub account ([github.com](https://github.com))

---

## Step 1 – Create the GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `Samayak-CampusMitra`
3. Description: `A centralized academic management portal for faculty and students`
4. Set visibility: **Public** (or Private if preferred)
5. ❌ Do NOT check "Add a README file" (we already have one)
6. Click **Create repository**

---

## Step 2 – Open Terminal in Your Project Folder

Navigate to your project directory (where index.html lives):

```bash
cd path/to/samayak
```

---

## Step 3 – Initialize Git

```bash
git init
```

This creates a hidden `.git` folder — this is your local repository.

---

## Step 4 – Connect to GitHub

Copy the remote URL from your new GitHub repo page (it looks like `https://github.com/YOUR-USERNAME/Samayak-CampusMitra.git`), then run:

```bash
git remote add origin https://github.com/YOUR-USERNAME/Samayak-CampusMitra.git
```

---

## Step 5 – Stage All Files

```bash
git add .
```

The `.` means "add everything". To check what's staged:

```bash
git status
```

---

## Step 6 – Make Your First Commit

```bash
git commit -m "Initial commit: landing page + all HTML pages"
```

Use clear commit messages — they're your project's history.

---

## Step 7 – Push to GitHub

```bash
git branch -M main
git push -u origin main
```

- `branch -M main` renames the default branch to `main`
- `-u origin main` sets the upstream so future pushes are just `git push`

---

## ✅ Your project is now live on GitHub!

Visit: `https://github.com/YOUR-USERNAME/Samayak-CampusMitra`

---

## Step 8 (Optional) – Enable GitHub Pages (Free Hosting)

Host your site for free at `https://YOUR-USERNAME.github.io/Samayak-CampusMitra/`:

1. Go to your repo → **Settings** → **Pages** (left sidebar)
2. Under **Source**, choose **Deploy from a branch**
3. Branch: `main`, Folder: `/ (root)`
4. Click **Save**
5. Wait 1–2 minutes, then visit the URL shown

---

## Daily Workflow (After Initial Setup)

Every time you make changes:

```bash
# 1. Stage your changes
git add .

# 2. Commit with a meaningful message
git commit -m "Add student dashboard preview section"

# 3. Push to GitHub
git push
```

---

## Useful Git Commands

| Command | What it does |
|---|---|
| `git status` | See which files are changed/staged |
| `git log --oneline` | See commit history |
| `git diff` | See exact line changes |
| `git add filename.html` | Stage a specific file |
| `git restore filename.html` | Undo unsaved changes |
| `git pull` | Pull latest changes from GitHub |

---

## Recommended Commit Message Format

```
feat: add faculty registration form
fix: correct nav link on about page
style: improve mobile responsiveness
docs: update README with setup steps
```

---

## Project File Structure

```
samayak/
├── index.html          ← Landing page (main)
├── about.html          ← About page
├── features.html       ← Features overview
├── faculty.html        ← Faculty module page
├── student.html        ← Student dashboard page
├── contact.html        ← Contact form
├── login.html          ← Login / Register portal
├── style.css           ← Main styles (shared)
├── pages.css           ← Inner page styles (shared)
├── shared.js           ← Nav + footer injected via JS
├── .gitignore          ← Files Git should ignore
└── README.md           ← Project documentation
```

---

*Happy shipping! 🌿 — Samayak CampusMitra*
