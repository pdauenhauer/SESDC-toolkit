# Project Initialization Guide

## Prerequisites

### Windows
- [Git](https://git-scm.com/download/win) installed
- A terminal (GitBash or the Visual Studio Code Terminal recommended)
- [Node.js and npm](https://nodejs.org/) installed
- A Firebase/Google account — contact Peter to be added to the Firebase project
- [Python](https://www.python.org/downloads/) installed

### Mac
- **Homebrew** — install with:
  ```bash
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```
- **Git** — `brew install git` (verify with `git --version`)
- **Node.js and npm** — `brew install node` (verify with `node --version`)
- A Firebase/Google account — contact Peter to be added to the Firebase project

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/pdauenhauer/SESDC-toolkit.git
cd SESDC-Toolkit
```

> The recommended working branch is `test`. Work there and push to `main` only when you have substantial changes ready.

---

## Step 2: Install Root Dependencies

```bash
npm install
```

If you see vulnerability warnings:

```bash
npm audit fix
```

---

## Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Step 4: Install Firebase CLI

```bash
npm install -g firebase-tools
```

If you encounter permission errors on Mac, try:

```bash
sudo npm install -g firebase-tools
```

Verify the installation:

```bash
firebase --version
```

---

## Step 5: Log In to Firebase

```bash
firebase login
```

This opens a browser window for authentication. Return to the terminal — it should display a success message.

---

## Step 6: Initialize the Firebase Project

Set the active project:

```bash
firebase use sesdc-toolkit2
```

Then run the initializer:

```bash
firebase init
```

Follow the prompts as below:

1. **Select features:** Firestore, Functions, Hosting *(not App Hosting)*, Storage, Emulators
2. **Firestore rules** — do **not** overwrite, press `n`
3. **Functions:** select *overwrite existing codebase*, choose **Python** as the language
4. **Functions files** — do **not** overwrite any existing files, press `n` for each
5. **Install dependencies** — press `Y`
6. **Hosting public directory** — use the default (`public`), press Enter
7. **Single-page app** — press `n`
8. **Automatic GitHub deploys** — press `n`
9. **Remaining file prompts** — press `n` to avoid overwriting
10. **Storage rules** — use `storage.rules`, press Enter; do **not** overwrite
11. **Emulators** — select: Authentication, Firestore, Functions, Storage
12. **Emulator ports** — use the defaults, press Enter
13. **Install emulators now** — press `Y`

Firebase is now set up in your directory.
