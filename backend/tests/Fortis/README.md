# Playwright Generated Framework

This folder is prepared to run AI-generated Playwright test files.

## Project Structure

- `sanity/` stores sanity spec files
- `regression/` stores regression spec files
- `playwright.config.js` contains the Playwright config
- `package.json` contains the test script and dependencies

## Install

Run these commands inside this folder:

```powershell
npm install
npx playwright install
```

## Run All Tests

```powershell
npm test
```

## Run Sanity Tests

```powershell
npm run test:sanity
```

## Run Regression Tests

```powershell
npm run test:regression
```

## Run One Spec File

```powershell
npx playwright test sanity/<your-file>.spec.js --project=chromium --headed
```

## Run On Specific Browsers

```powershell
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Notes

- Save or copy typed generated specs into `sanity/` or `regression/`
- Use `--headed` if you want to watch the browser run
- Current framework folder: `C:\Users\sharath.ls\Documents\Record_and_playback_Playwright\record_and_play_back\backend\tests\Fortis`
