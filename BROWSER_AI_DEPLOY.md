# Browser AI deployment

The disease scanner and knock analysis run in the visitor's browser. The primary disease card uses only `legacy4`; `wide9` is an optional observation and is downloaded only when selected. Chat uses reviewed local knowledge and rule based safety replies without a key. Conversation and scan history stay in that browser's local storage.

## Publish on Firebase Hosting Spark

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run test
npm.cmd run build
firebase deploy --only hosting
```

The `public/models/` directory must include `model.onnx`, `model.onnx.json`, `wide9.onnx`, `wide9.labels.json`, and `ort-wasm-simd-threaded.wasm` before building. The copied model files are large; check Hosting storage and daily transfer in Firebase Console. A missing or corrupt model is reported as unavailable and never replaced with a random diagnosis.

`firebase.json` gives `/models/**` a one-year immutable cache. When replacing model weights, change the model URL or cache path in `browserVisionEngine.ts` at the same time so returning devices do not keep the previous weights under the same filename.

The `VITE_GEMINI_API_KEY` build variable is supported for private builds only. Vite embeds it in public JavaScript. Do not set a shared project key when publishing a public site. Without a key, reviewed knowledge and the safety rules continue to answer supported questions. A user can store a personal key on their own device under the local storage key `watermelon.gemini.apiKey` (for example with `localStorage.setItem('watermelon.gemini.apiKey', 'THEIR_KEY')` in that browser's developer console). Gemini's free tier has usage limits, so it is not an unlimited public chat service.

The old account, plot and upload endpoints still require a separately hosted backend. This change removes the backend requirement for the listed AI features, not for every route in the app. Browser storage is per origin and per device; clearing site data removes local history.
