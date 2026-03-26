# DemoForge — Test Cases

## TC-AUTH: Authentication

### TC-AUTH-001
**Description:** GitHub OAuth login — happy path
**Prerequisites:** Valid GitHub account, app running locally on PORT=3001
**Steps:**
1. Navigate to `/login`
2. Click "Sign in with GitHub"
3. Authorize the OAuth app in GitHub
**Expected Result:** Redirected to `/demos`. Session cookie set. `supabase.auth.getUser()` returns a valid user object.
**Pass Criteria:** User lands on `/demos` dashboard without error; no `error=auth_failed` in URL.

---

### TC-AUTH-002
**Description:** Auth callback with valid `next` param redirects correctly
**Prerequisites:** Valid OAuth code available
**Steps:**
1. Navigate to `/auth/callback?code=VALID_CODE&next=/demos/abc123`
**Expected Result:** After session exchange, user is redirected to `/demos/abc123`.
**Pass Criteria:** Response is a 302/307 to `${origin}/demos/abc123`.

---

### TC-AUTH-003
**Description:** Auth callback rejects open redirect via `//evil.com`
**Prerequisites:** Valid OAuth code available
**Steps:**
1. Navigate to `/auth/callback?code=VALID_CODE&next=//evil.com/steal`
**Expected Result:** `next` param is ignored; user is redirected to `/demos`.
**Pass Criteria:** Redirect target is `${origin}/demos`, not `//evil.com/steal`.

---

### TC-AUTH-004
**Description:** Auth callback rejects absolute URL as `next` param
**Prerequisites:** Valid OAuth code available
**Steps:**
1. Navigate to `/auth/callback?code=VALID_CODE&next=https://evil.com`
**Expected Result:** Redirect goes to `/demos`, not `https://evil.com`.
**Pass Criteria:** Redirect target starts with `${origin}/demos`.

---

### TC-AUTH-005
**Description:** Auth callback with invalid code redirects to login with error
**Prerequisites:** None
**Steps:**
1. Navigate to `/auth/callback?code=INVALID_CODE`
**Expected Result:** Redirect to `/login?error=auth_failed`.
**Pass Criteria:** URL contains `error=auth_failed`.

---

### TC-AUTH-006
**Description:** Auth callback with no code redirects to login with error
**Prerequisites:** None
**Steps:**
1. Navigate to `/auth/callback` (no `code` param)
**Expected Result:** Redirect to `/login?error=auth_failed`.
**Pass Criteria:** URL contains `error=auth_failed`.

---

### TC-AUTH-007
**Description:** Unauthenticated user cannot access `/demos`
**Prerequisites:** User is not logged in (no session cookie)
**Steps:**
1. Navigate directly to `/demos`
**Expected Result:** Redirected to `/login`.
**Pass Criteria:** Page is not the demos dashboard; URL is `/login` or contains a redirect param.

---

### TC-AUTH-008
**Description:** Unauthenticated user cannot access any API endpoint
**Prerequisites:** No session cookie
**Steps:**
1. Send `GET /api/demos/some-id` with no auth header or session cookie
**Expected Result:** `401 { error: "Unauthorized", code: "UNAUTHORIZED" }`
**Pass Criteria:** HTTP status 401; body contains `code: "UNAUTHORIZED"`.

---

### TC-AUTH-009
**Description:** Session persists across page reload
**Prerequisites:** User is logged in
**Steps:**
1. Log in via GitHub OAuth
2. Hard-reload the `/demos` page
**Expected Result:** User remains logged in; dashboard loads normally.
**Pass Criteria:** No redirect to `/login` after reload.

---

## TC-DEMO: Demo CRUD

### TC-DEMO-001
**Description:** Create a demo with `repo` source type
**Prerequisites:** Authenticated user
**Steps:**
1. `POST /api/demos` with body `{ projectName: "Test App", sourceType: "repo" }`
**Expected Result:** `201` response with a DemoProject object. `renderStatus` is `"draft"`.
**Pass Criteria:** Response contains `id`, `renderStatus: "draft"`, `sourceType: "repo"`.

---

### TC-DEMO-002
**Description:** Create a demo — projectName is required
**Prerequisites:** Authenticated user
**Steps:**
1. `POST /api/demos` with body `{ sourceType: "repo" }` (no `projectName`)
**Expected Result:** `400` with validation error.
**Pass Criteria:** HTTP status 400; body contains `code: "VALIDATION_ERROR"`.

---

### TC-DEMO-003
**Description:** Fetch an existing demo by ID
**Prerequisites:** Authenticated user with an existing demo
**Steps:**
1. `GET /api/demos/:id`
**Expected Result:** `200` with full DemoProject object.
**Pass Criteria:** Response includes all fields: `id`, `projectName`, `renderStatus`, `sourceType`, etc.

---

### TC-DEMO-004
**Description:** Fetch demo belonging to another user returns 404
**Prerequisites:** Two authenticated users (UserA owns demo, UserB makes request)
**Steps:**
1. UserB sends `GET /api/demos/:id` where `:id` belongs to UserA
**Expected Result:** `404 { error: "Demo not found", code: "NOT_FOUND" }`.
**Pass Criteria:** HTTP status 404.

---

### TC-DEMO-005
**Description:** PATCH updates mutable fields
**Prerequisites:** Authenticated user with an existing demo
**Steps:**
1. `PATCH /api/demos/:id` with body `{ tagline: "New tagline", stylePreset: "cyber" }`
**Expected Result:** `200` with updated DemoProject. `tagline` and `stylePreset` reflect new values.
**Pass Criteria:** Response `tagline === "New tagline"` and `stylePreset === "cyber"`.

---

### TC-DEMO-006
**Description:** PATCH with `sourceType: "repo"` succeeds (previously missing enum value)
**Prerequisites:** Authenticated user with an existing demo
**Steps:**
1. `PATCH /api/demos/:id` with body `{ sourceType: "repo" }`
**Expected Result:** `200` with updated demo; `sourceType: "repo"`.
**Pass Criteria:** No validation error; `sourceType` is `"repo"` in the response.

---

### TC-DEMO-007
**Description:** PATCH with invalid `sourceType` returns 400
**Prerequisites:** Authenticated user with an existing demo
**Steps:**
1. `PATCH /api/demos/:id` with body `{ sourceType: "invalid" }`
**Expected Result:** `400 { code: "VALIDATION_ERROR" }`.
**Pass Criteria:** HTTP status 400.

---

### TC-DEMO-008
**Description:** DELETE removes the demo from DB
**Prerequisites:** Authenticated user with an existing demo
**Steps:**
1. `DELETE /api/demos/:id`
2. `GET /api/demos/:id`
**Expected Result:** DELETE returns `204`. GET returns `404`.
**Pass Criteria:** 204 on delete; subsequent GET returns 404.

---

### TC-DEMO-009
**Description:** DELETE cleans up Supabase Storage files (best-effort)
**Prerequisites:** Authenticated user with a demo that has a rendered video at `userId/demoId/demo.mp4`
**Steps:**
1. Confirm video exists in `videos` bucket at `userId/demoId/demo.mp4`
2. `DELETE /api/demos/:id`
3. Check Supabase Storage `videos` bucket for the path
**Expected Result:** `204` response; `userId/demoId/demo.mp4` no longer exists in storage.
**Pass Criteria:** Storage file is absent after delete (or delete returns 204 regardless of storage errors).

---

### TC-DEMO-010
**Description:** DELETE another user's demo returns 404
**Prerequisites:** Two authenticated users
**Steps:**
1. UserB sends `DELETE /api/demos/:id` where `:id` belongs to UserA
**Expected Result:** `404`. UserA's demo is not deleted.
**Pass Criteria:** HTTP status 404; demo still exists in DB.

---

## TC-REPO: Repo Analysis

### TC-REPO-001
**Description:** Analyze a public GitHub repo
**Prerequisites:** Demo with `sourceType: "repo"`, no prior code summary
**Steps:**
1. `POST /api/demos/:id/analyze-repo` with body `{ repoUrl: "https://github.com/owner/public-repo" }`
**Expected Result:** `200` with `codeSummary` object containing `stack`, `routes`, `features`, `codeSnippets`.
**Pass Criteria:** Response has `codeSummary.stack` (at least one non-null property) and `codeSummary.codeSnippets.length >= 1`.

---

### TC-REPO-002
**Description:** Analyze a private repo without a GitHub token returns an error
**Prerequisites:** Demo with `sourceType: "repo"`; user authenticated via magic link (no `provider_token`)
**Steps:**
1. `POST /api/demos/:id/analyze-repo` with body `{ repoUrl: "https://github.com/owner/private-repo" }`
**Expected Result:** Error response (401 or 404 from Octokit, surfaced as 4xx).
**Pass Criteria:** Response is not 200; error message indicates access failure.

---

### TC-REPO-003
**Description:** Analyze repo with invalid URL returns 400
**Prerequisites:** Authenticated user with a demo
**Steps:**
1. `POST /api/demos/:id/analyze-repo` with body `{ repoUrl: "not-a-url" }`
**Expected Result:** `400` validation error.
**Pass Criteria:** HTTP status 400.

---

### TC-REPO-004
**Description:** Analyze repo with non-GitHub URL returns 400
**Prerequisites:** Authenticated user with a demo
**Steps:**
1. `POST /api/demos/:id/analyze-repo` with body `{ repoUrl: "https://gitlab.com/owner/repo" }`
**Expected Result:** `400` with error indicating only GitHub repos are supported.
**Pass Criteria:** HTTP status 400.

---

### TC-REPO-005
**Description:** Code snippets are saved to DB (top 3 files, max 1500 chars each)
**Prerequisites:** Successful repo analysis
**Steps:**
1. Run `analyze-repo` on a repo with at least 3 files
2. Fetch the demo via `GET /api/demos/:id`
**Expected Result:** `codeSummary.codeSnippets` has 1–3 entries; each entry's `content` is at most 1500 chars.
**Pass Criteria:** `codeSnippets.length <= 3`; every snippet's `content.length <= 1500`.

---

### TC-REPO-006
**Description:** Re-analyzing overwrites the existing `codeSummary`
**Prerequisites:** Demo with an existing `codeSummary`
**Steps:**
1. `POST /api/demos/:id/analyze-repo` with the same repo URL
**Expected Result:** `200`; `codeSummary` is refreshed (new `updatedAt` on the demo).
**Pass Criteria:** HTTP status 200; demo `updatedAt` is newer than before.

---

### TC-REPO-007
**Description:** Repo panel section is hidden for non-repo source types
**Prerequisites:** Demo with `sourceType: "screenshots"`
**Steps:**
1. Navigate to `/demos/:id` for a demo with `sourceType: "screenshots"`
**Expected Result:** The "Repo Analysis" section is not rendered on the page.
**Pass Criteria:** No element with "Repo Analysis" heading visible in the DOM.

---

### TC-REPO-008
**Description:** Repo panel section is visible for `sourceType: "repo"`
**Prerequisites:** Demo with `sourceType: "repo"`
**Steps:**
1. Navigate to `/demos/:id` for a demo with `sourceType: "repo"`
**Expected Result:** The "Repo Analysis" section is rendered.
**Pass Criteria:** Element with "Repo Analysis" heading is visible in the DOM.

---

### TC-REPO-009
**Description:** Repo panel section is visible for `sourceType: "repo+screenshots"`
**Prerequisites:** Demo with `sourceType: "repo+screenshots"`
**Steps:**
1. Navigate to `/demos/:id` for a demo with `sourceType: "repo+screenshots"`
**Expected Result:** The "Repo Analysis" section is rendered.
**Pass Criteria:** Element with "Repo Analysis" heading is visible in the DOM.

---

## TC-GEN: Code Generation

### TC-GEN-001
**Description:** Generate composition for a demo with existing repo analysis
**Prerequisites:** Authenticated user; demo with `codeSummary` set and user has a valid Anthropic API key in Settings
**Steps:**
1. `POST /api/demos/:id/generate-composition`
**Expected Result:** `200` with `{ generatedCode: "..." }`. Demo `renderStatus` becomes `"config_generated"`.
**Pass Criteria:** `generatedCode` contains `"GeneratedDemo"` and `"GENERATED_DURATION"`. DB `renderStatus` is `"config_generated"`.

---

### TC-GEN-002
**Description:** First-time user without an API key uses the free generation slot
**Prerequisites:** Authenticated user with no API key saved; `freeGenerationsUsed: 0` in DB
**Steps:**
1. `POST /api/demos/:id/generate-composition`
**Expected Result:** `200`; generation succeeds using app API key. `freeGenerationsUsed` becomes `1`.
**Pass Criteria:** HTTP 200; `userProfile.freeGenerationsUsed === 1` after the call.

---

### TC-GEN-003
**Description:** Second generation attempt without API key returns 402
**Prerequisites:** Authenticated user with no API key; `freeGenerationsUsed: 1` in DB
**Steps:**
1. `POST /api/demos/:id/generate-composition`
**Expected Result:** `402 { code: "API_KEY_REQUIRED" }`.
**Pass Criteria:** HTTP 402; `code === "API_KEY_REQUIRED"`.

---

### TC-GEN-004
**Description:** Concurrent free generation requests — only one succeeds (atomic transaction)
**Prerequisites:** Authenticated user with no API key; `freeGenerationsUsed: 0` in DB
**Steps:**
1. Send two simultaneous `POST /api/demos/:id/generate-composition` requests
**Expected Result:** Exactly one request gets 200; the other gets 402.
**Pass Criteria:** Exactly one 200 and one 402; `freeGenerationsUsed === 1` in DB (not 2).

---

### TC-GEN-005
**Description:** Generated code is stored in DB
**Prerequisites:** Successful generation
**Steps:**
1. Run generate-composition
2. `GET /api/demos/:id`
**Expected Result:** `generatedCode` field is non-null and contains valid TypeScript.
**Pass Criteria:** `demo.generatedCode` starts with `import` or `const` (valid TS, no markdown fences).

---

### TC-GEN-006
**Description:** Generate composition without repo analysis still works (uses project info only)
**Prerequisites:** Demo with no `codeSummary`; user has API key
**Steps:**
1. `POST /api/demos/:id/generate-composition`
**Expected Result:** `200` with valid `generatedCode`. Prompt uses project name/description/features.
**Pass Criteria:** HTTP 200; `generatedCode` contains `"GeneratedDemo"`.

---

### TC-GEN-007
**Description:** Generated code fails sanity check — returns 502
**Prerequisites:** Scenario where Claude returns code without `GeneratedDemo` export (mock or real)
**Steps:**
1. Force Claude to return incomplete code (test harness or modified prompt)
**Expected Result:** `502 { code: "PARSE_ERROR" }`.
**Pass Criteria:** HTTP 502; no DB update to `renderStatus`.

---

### TC-GEN-008
**Description:** User's own Anthropic API key takes priority over free slot
**Prerequisites:** Authenticated user with both a saved API key and `freeGenerationsUsed: 0`
**Steps:**
1. `POST /api/demos/:id/generate-composition`
**Expected Result:** `200`; `freeGenerationsUsed` remains `0` (user's own key was used).
**Pass Criteria:** `userProfile.freeGenerationsUsed === 0` after the call.

---

## TC-RENDER: Render Pipeline

### TC-RENDER-001
**Description:** Trigger render with generated code
**Prerequisites:** Demo with `generatedCode` set and `renderStatus: "config_generated"`
**Steps:**
1. `POST /api/demos/:id/render`
**Expected Result:** `202 { renderStatus: "rendering" }` immediately. DB `renderStatus` becomes `"rendering"`.
**Pass Criteria:** HTTP 202; `demo.renderStatus === "rendering"` in DB.

---

### TC-RENDER-002
**Description:** Render without any generated code returns 400
**Prerequisites:** Demo with no `generatedCode` and no `demoConfig`
**Steps:**
1. `POST /api/demos/:id/render`
**Expected Result:** `400 { code: "NO_CONFIG" }`.
**Pass Criteria:** HTTP 400; `code === "NO_CONFIG"`.

---

### TC-RENDER-003
**Description:** Concurrent render attempt returns 409
**Prerequisites:** Demo with `renderStatus: "rendering"` already set
**Steps:**
1. `POST /api/demos/:id/render`
**Expected Result:** `409 { code: "ALREADY_RENDERING" }`.
**Pass Criteria:** HTTP 409; `code === "ALREADY_RENDERING"`.

---

### TC-RENDER-004
**Description:** Render status polling
**Prerequisites:** Demo with `renderStatus: "rendering"`
**Steps:**
1. Poll `GET /api/demos/:id/render/status` every 3 seconds until status changes
**Expected Result:** Eventually returns `{ renderStatus: "ready", videoUrl: "https://..." }` or `{ renderStatus: "failed" }`.
**Pass Criteria:** Status transitions from `"rendering"` to `"ready"` or `"failed"` within 5 minutes.

---

### TC-RENDER-005
**Description:** Successful render sets `videoUrl` in DB
**Prerequisites:** Render completes successfully
**Steps:**
1. Wait for render to finish
2. `GET /api/demos/:id`
**Expected Result:** `renderStatus: "ready"` and `videoUrl` is a valid Supabase Storage public URL.
**Pass Criteria:** `videoUrl` matches pattern `https://*.supabase.co/storage/v1/object/public/videos/*/demo.mp4`.

---

### TC-RENDER-006
**Description:** Failed render sets `renderStatus: "failed"`
**Prerequisites:** Intentionally broken `generatedCode` (invalid TSX that won't compile)
**Steps:**
1. Set `generatedCode` to invalid TS
2. `POST /api/demos/:id/render`
3. Poll status
**Expected Result:** `renderStatus` becomes `"failed"` in DB.
**Pass Criteria:** `demo.renderStatus === "failed"` after render completes.

---

### TC-RENDER-007
**Description:** Video is uploaded to Supabase Storage at correct path
**Prerequisites:** Successful render
**Steps:**
1. After render completes, check Supabase Storage `videos` bucket
**Expected Result:** File exists at `{userId}/{demoId}/demo.mp4`.
**Pass Criteria:** File is present at the exact path with `content-type: video/mp4`.

---

### TC-RENDER-008
**Description:** Render of another user's demo returns 404
**Prerequisites:** Two authenticated users
**Steps:**
1. UserB sends `POST /api/demos/:id/render` where `:id` belongs to UserA
**Expected Result:** `404 { code: "NOT_FOUND" }`.
**Pass Criteria:** HTTP 404; no render is triggered.

---

### TC-RENDER-009
**Description:** `GeneratedDemo.tsx` is overwritten on disk before bundling
**Prerequisites:** Existing `GeneratedDemo.tsx` with previous content
**Steps:**
1. Trigger a render with new `generatedCode`
2. After render starts, read `src/remotion/GeneratedDemo.tsx` on disk
**Expected Result:** File content matches the new `generatedCode`, not the old version.
**Pass Criteria:** File content equals the `generatedCode` from the DB for this demo.

---

## TC-ITER: Iteration

### TC-ITER-001
**Description:** Apply iteration with a valid API key
**Prerequisites:** Demo with `generatedCode` set; user has Anthropic API key saved
**Steps:**
1. `POST /api/demos/:id/iterate` with body `{ message: "Make the hook more energetic" }`
**Expected Result:** `200`; `generatedCode` in DB is updated.
**Pass Criteria:** HTTP 200; `demo.generatedCode` differs from the pre-iterate value.

---

### TC-ITER-002
**Description:** Iterate without an API key returns 402
**Prerequisites:** Demo with `generatedCode`; user has no API key saved and has used their free generation
**Steps:**
1. `POST /api/demos/:id/iterate` with a message
**Expected Result:** `402 { code: "API_KEY_REQUIRED" }`.
**Pass Criteria:** HTTP 402; `apiKeyRequired` state shown in UI.

---

### TC-ITER-003
**Description:** IteratePanel shows `justIterated` banner after success
**Prerequisites:** Demo detail page open; iteration succeeds
**Steps:**
1. Apply an iteration via the IteratePanel form
2. Wait for success
**Expected Result:** Banner appears: "Demo updated — scroll down and click Render Video to export the new version."
**Pass Criteria:** Banner element with accent color is visible on page.

---

### TC-ITER-004
**Description:** `justIterated` banner can be dismissed
**Prerequisites:** Banner is visible after a successful iteration
**Steps:**
1. Click the "✕" button on the banner
**Expected Result:** Banner disappears.
**Pass Criteria:** Banner is no longer in the DOM.

---

### TC-ITER-005
**Description:** Quick prompt chips populate the input field
**Prerequisites:** Demo detail page with IteratePanel visible
**Steps:**
1. Click "Make the hook scene faster and more energetic" chip
**Expected Result:** Input field value becomes "Make the hook scene faster and more energetic".
**Pass Criteria:** Input `value` matches the chip label exactly.

---

### TC-ITER-006
**Description:** Empty message cannot be submitted
**Prerequisites:** IteratePanel with no message entered
**Steps:**
1. Do not type anything in the input
2. Attempt to submit the form
**Expected Result:** Submit button is disabled; no API call is made.
**Pass Criteria:** Button has `disabled` attribute when `message.trim() === ""`.

---

### TC-ITER-007
**Description:** Iterate while loading is disabled (no double-submit)
**Prerequisites:** Iteration request in flight
**Steps:**
1. Submit an iteration
2. Immediately try to submit again
**Expected Result:** Second submission is blocked; `loading` state prevents it.
**Pass Criteria:** Only one network request is made.

---

### TC-ITER-008
**Description:** IteratePanel is hidden when `hasGeneratedCode` is false
**Prerequisites:** Demo with no `generatedCode`
**Steps:**
1. Navigate to `/demos/:id` for a demo with `generatedCode: null`
**Expected Result:** IteratePanel is not rendered.
**Pass Criteria:** No "Iterate" heading visible on the page.

---

## TC-SETTINGS: Settings / BYOK

### TC-SETTINGS-001
**Description:** Save a valid Anthropic API key
**Prerequisites:** Authenticated user; Settings page
**Steps:**
1. Navigate to `/settings`
2. Enter a valid Anthropic API key (starts with `sk-ant-`)
3. Submit
**Expected Result:** Success message shown; key is saved (encrypted) in DB.
**Pass Criteria:** Subsequent generation attempts use the saved key; no 402 returned.

---

### TC-SETTINGS-002
**Description:** Saved API key is not returned in plaintext via any API
**Prerequisites:** User has saved an API key
**Steps:**
1. `GET /api/demos/:id` (or any public API response)
2. Check all API responses for raw `sk-ant-` strings
**Expected Result:** No plaintext API key appears in any API response.
**Pass Criteria:** No response body contains a string matching `sk-ant-[A-Za-z0-9-]+`.

---

### TC-SETTINGS-003
**Description:** `freeGenerationsUsed` count displayed on Settings page
**Prerequisites:** User has used 1 free generation
**Steps:**
1. Navigate to `/settings`
**Expected Result:** UI shows "1 / 1 free generations used" (or equivalent).
**Pass Criteria:** Free generation count is accurately reflected in the UI.

---

### TC-SETTINGS-004
**Description:** Updating API key overwrites the previous key
**Prerequisites:** User has an existing API key saved
**Steps:**
1. Navigate to `/settings`
2. Enter a new API key
3. Submit
**Expected Result:** Only the new key is saved; old key is no longer used.
**Pass Criteria:** Generation uses the new key; old key produces no auth.

---

### TC-SETTINGS-005
**Description:** Empty API key field does not clear a saved key
**Prerequisites:** User has an existing API key saved
**Steps:**
1. Navigate to `/settings`
2. Submit the form with an empty API key field
**Expected Result:** Existing key is preserved; no overwrite with empty string.
**Pass Criteria:** `getUserApiKey()` still returns the original key after the empty submit.

---

### TC-SETTINGS-006
**Description:** Settings page requires authentication
**Prerequisites:** Unauthenticated user
**Steps:**
1. Navigate to `/settings` without being logged in
**Expected Result:** Redirected to `/login`.
**Pass Criteria:** URL is `/login`; Settings page content is not shown.

---

### TC-SETTINGS-007
**Description:** API key is stored encrypted in the database
**Prerequisites:** User saves an API key
**Steps:**
1. Save an API key via Settings
2. Query the DB directly: `SELECT "anthropicApiKey" FROM user_profiles WHERE id = '...'`
**Expected Result:** The stored value is an encrypted string, not the plaintext `sk-ant-...` key.
**Pass Criteria:** Stored value does not match the plaintext key; `decrypt()` round-trips correctly.

---

### TC-SETTINGS-008
**Description:** `getUserApiKey` returns null for user with no profile record
**Prerequisites:** New user who has never visited Settings
**Steps:**
1. Call `getUserApiKey(userId)` for a user with no `userProfile` row
**Expected Result:** Returns `null`.
**Pass Criteria:** No error thrown; result is `null`.

---

## TC-SHARE: Share Page

### TC-SHARE-001
**Description:** Share page renders for a demo with `renderStatus: "ready"`
**Prerequisites:** Demo with `videoUrl` set
**Steps:**
1. Navigate to `/share/:id` (or equivalent share URL)
**Expected Result:** Page renders with the video player and demo name.
**Pass Criteria:** Video element is present in DOM; `videoUrl` is used as the `src`.

---

### TC-SHARE-002
**Description:** Share page is accessible without authentication
**Prerequisites:** Demo with `renderStatus: "ready"`; user is logged out
**Steps:**
1. Log out
2. Navigate to the share URL
**Expected Result:** Page renders successfully without redirect to login.
**Pass Criteria:** HTTP 200; page content is visible; no redirect to `/login`.

---

### TC-SHARE-003
**Description:** Share page for a non-ready demo shows appropriate state
**Prerequisites:** Demo with `renderStatus: "draft"` or `"rendering"`
**Steps:**
1. Navigate to the share URL for a non-ready demo
**Expected Result:** Page shows a "not ready" or "processing" message; no broken video element.
**Pass Criteria:** No raw `null` or empty `src` attribute on a video element.

---

### TC-SHARE-004
**Description:** Share page for non-existent demo returns 404
**Prerequisites:** None
**Steps:**
1. Navigate to `/share/nonexistent-id`
**Expected Result:** Next.js 404 page.
**Pass Criteria:** HTTP 404.

---

### TC-SHARE-005
**Description:** Share URL is stable — same URL after re-render
**Prerequisites:** Demo with a completed render
**Steps:**
1. Note the share URL
2. Trigger a second render
3. After completion, check the share URL
**Expected Result:** Share URL path does not change; `videoUrl` in DB is updated but the path `userId/demoId/demo.mp4` remains the same.
**Pass Criteria:** Share URL is the same after re-render (upsert behavior in storage).

---

### TC-SHARE-006
**Description:** Share page shows project name and tagline
**Prerequisites:** Demo with `projectName` and `tagline` set, `renderStatus: "ready"`
**Steps:**
1. Navigate to the share URL
**Expected Result:** Project name and tagline are visible on the page.
**Pass Criteria:** DOM contains the exact project name and tagline strings.

---

### TC-SHARE-007
**Description:** Share page video is downloadable
**Prerequisites:** Demo with `renderStatus: "ready"` and a public `videoUrl`
**Steps:**
1. Navigate to the share URL
2. Try to download the video (right-click or download button)
**Expected Result:** Video file downloads as an MP4.
**Pass Criteria:** Download completes; file has `.mp4` extension and plays correctly.

---

### TC-SHARE-008
**Description:** Share page meta tags (OG) are correct for social sharing
**Prerequisites:** Demo with `renderStatus: "ready"`, `projectName`, and `tagline`
**Steps:**
1. Fetch the share URL and inspect `<head>`
**Expected Result:** `og:title` contains the project name; `og:description` contains the tagline.
**Pass Criteria:** `og:title` and `og:description` tags are present and accurate.

---

## TC-SEC: Security

### TC-SEC-001
**Description:** IDOR — cannot read another user's demo via GET
**Prerequisites:** Two authenticated users (UserA and UserB); UserA has a demo
**Steps:**
1. UserB sends `GET /api/demos/:id` where `:id` belongs to UserA
**Expected Result:** `404 { code: "NOT_FOUND" }`.
**Pass Criteria:** HTTP 404; UserA's data is not exposed.

---

### TC-SEC-002
**Description:** IDOR — cannot update another user's demo via PATCH
**Prerequisites:** Two authenticated users
**Steps:**
1. UserB sends `PATCH /api/demos/:id` with `{ projectName: "hacked" }` where `:id` belongs to UserA
**Expected Result:** `404`.
**Pass Criteria:** HTTP 404; UserA's demo name is unchanged in DB.

---

### TC-SEC-003
**Description:** IDOR — cannot delete another user's demo via DELETE
**Prerequisites:** Two authenticated users
**Steps:**
1. UserB sends `DELETE /api/demos/:id` where `:id` belongs to UserA
**Expected Result:** `404`.
**Pass Criteria:** HTTP 404; UserA's demo still exists in DB.

---

### TC-SEC-004
**Description:** IDOR — cannot trigger render of another user's demo
**Prerequisites:** Two authenticated users
**Steps:**
1. UserB sends `POST /api/demos/:id/render` where `:id` belongs to UserA
**Expected Result:** `404`.
**Pass Criteria:** HTTP 404; no render is triggered for UserA's demo.

---

### TC-SEC-005
**Description:** Open redirect prevention — `next` param with protocol-relative URL
**Prerequisites:** None
**Steps:**
1. Navigate to `/auth/callback?code=VALID&next=//attacker.com/phish`
**Expected Result:** Redirect goes to `${origin}/demos`, not `//attacker.com/phish`.
**Pass Criteria:** Redirect target is within the app origin.

---

### TC-SEC-006
**Description:** Open redirect prevention — `next` param with `javascript:` scheme
**Prerequisites:** None
**Steps:**
1. Navigate to `/auth/callback?code=VALID&next=javascript:alert(1)`
**Expected Result:** Redirect goes to `${origin}/demos`.
**Pass Criteria:** No JavaScript execution; redirect is safe.

---

### TC-SEC-007
**Description:** Supabase service role key is never exposed to the client
**Prerequisites:** App running
**Steps:**
1. Inspect all `<script>` tags and `window.__NEXT_DATA__` in any page source
2. Search for `SUPABASE_SERVICE_ROLE_KEY` value
**Expected Result:** Service role key does not appear in any client-side JavaScript.
**Pass Criteria:** No match for the service role key value in any client bundle.

---

### TC-SEC-008
**Description:** Anthropic API key is never returned in API responses
**Prerequisites:** User has saved an API key
**Steps:**
1. Inspect all API responses during a generation flow
**Expected Result:** No API response contains `sk-ant-...` in plaintext.
**Pass Criteria:** No match for `sk-ant-` pattern in any response body.

---

### TC-SEC-009
**Description:** SQL injection attempt in `projectName` is safely handled
**Prerequisites:** Authenticated user
**Steps:**
1. `POST /api/demos` with `{ projectName: "'; DROP TABLE demo_projects; --" }`
**Expected Result:** Demo is created normally with the literal string as the project name. No DB error.
**Pass Criteria:** HTTP 201; demo row exists; table is not dropped (Prisma uses parameterized queries).

---

### TC-SEC-010
**Description:** Oversized request body is rejected
**Prerequisites:** Authenticated user
**Steps:**
1. `PATCH /api/demos/:id` with `description` set to a 1MB string
**Expected Result:** `400` validation error (max 2000 chars per schema).
**Pass Criteria:** HTTP 400; no DB write.

---

## TC-UX: UX / User Journey

### TC-UX-001
**Description:** Complete happy path — repo source type, end-to-end
**Prerequisites:** Authenticated user; public GitHub repo URL
**Steps:**
1. Navigate to `/demos/new`
2. Step 1: Enter project name, select "GitHub Repo" source type, click Continue
3. Step 2: Skip screenshots (click "Skip →"), proceed to Step 3
4. Step 3: Select style, click "Create Demo →"
5. On demo detail page, click "Analyze Repo"
6. Click "Generate Demo"
7. Click "Render Video"
8. Wait for render to complete
**Expected Result:** MP4 video is available and playable.
**Pass Criteria:** `renderStatus: "ready"`; `videoUrl` loads a valid MP4.

---

### TC-UX-002
**Description:** Wizard Step 2 — repo-only source shows "Add screenshots (optional)" heading
**Prerequisites:** Wizard at Step 2 with `sourceType: "repo"`
**Steps:**
1. Complete Step 1 with "GitHub Repo" selected
2. Observe Step 2 heading
**Expected Result:** Heading reads "Add screenshots (optional)", not "Add your source".
**Pass Criteria:** `h2` text is "Add screenshots (optional)".

---

### TC-UX-003
**Description:** Wizard Step 2 — repo-only source shows Skip button
**Prerequisites:** Wizard at Step 2 with `sourceType: "repo"`
**Steps:**
1. Complete Step 1 with "GitHub Repo" selected
2. Observe Step 2 buttons
**Expected Result:** Both "Skip →" and "Continue anyway →" buttons are visible.
**Pass Criteria:** Button with text "Skip →" is present in the DOM.

---

### TC-UX-004
**Description:** Wizard Step 2 — Skip button advances to Step 3 without uploading screenshots
**Prerequisites:** Wizard at Step 2 with `sourceType: "repo"` and no screenshots added
**Steps:**
1. Click "Skip →"
**Expected Result:** Wizard advances to Step 3; no error.
**Pass Criteria:** Step indicator shows Step 3; no validation error shown.

---

### TC-UX-005
**Description:** Wizard Step 2 — Continue button label changes when screenshots are added
**Prerequisites:** Wizard at Step 2 with `sourceType: "repo"`
**Steps:**
1. Upload 1 screenshot
2. Observe the submit button label
**Expected Result:** Button label changes to "Continue →" (instead of "Continue anyway →").
**Pass Criteria:** Button text is "Continue →" when `screenshots.length > 0`.

---

### TC-UX-006
**Description:** Demo detail page — screenshots panel is hidden when no screenshots exist
**Prerequisites:** Demo with `screenshotUrls: []`
**Steps:**
1. Navigate to `/demos/:id` for a demo with no screenshots
**Expected Result:** "Screenshots" section is not rendered.
**Pass Criteria:** No element with "Screenshots" heading in the DOM.

---

### TC-UX-007
**Description:** Demo detail page — video player appears after render is ready
**Prerequisites:** Demo transitions from `"rendering"` to `"ready"`
**Steps:**
1. Trigger a render
2. Poll the page or wait for status to change
3. Refresh the page after `renderStatus: "ready"`
**Expected Result:** A video player is visible with the rendered MP4.
**Pass Criteria:** `<video>` or player element with non-null `src` is present.

---

### TC-UX-008
**Description:** Dashboard shows all user's demos
**Prerequisites:** Authenticated user with 3 demo projects
**Steps:**
1. Navigate to `/demos`
**Expected Result:** All 3 demo cards are shown with their names and statuses.
**Pass Criteria:** 3 demo cards are rendered; each shows `projectName` and `renderStatus` badge.

---

### TC-UX-009
**Description:** Delete demo from dashboard removes it from the list
**Prerequisites:** Authenticated user with at least 1 demo on the dashboard
**Steps:**
1. Navigate to `/demos`
2. Click delete on a demo
3. Confirm deletion
**Expected Result:** Demo card disappears from the list; no 500 error.
**Pass Criteria:** Dashboard re-renders without the deleted demo.

---

### TC-UX-010
**Description:** Status badge reflects current `renderStatus` accurately
**Prerequisites:** Demo at various stages
**Steps:**
1. Check badge for `"draft"`, `"config_generated"`, `"rendering"`, `"ready"`, `"failed"` states
**Expected Result:** Badge text/color matches the state (e.g., "ready" shows green, "failed" shows red).
**Pass Criteria:** Each `renderStatus` value maps to a distinct, correct visual indicator.

---

### TC-UX-011
**Description:** Generate Composition section only shows for repo source types
**Prerequisites:** Demo with `sourceType: "screenshots"`
**Steps:**
1. Navigate to `/demos/:id` for a demo with `sourceType: "screenshots"`
**Expected Result:** "Generate Demo" section is not rendered.
**Pass Criteria:** No element with "Generate Demo" heading or "AI code gen" badge visible.

---

### TC-UX-012
**Description:** Error toast appears when API call fails
**Prerequisites:** Demo detail page open
**Steps:**
1. Trigger an action that will fail (e.g., generate with an invalid API key)
**Expected Result:** Toast notification with an error message appears.
**Pass Criteria:** Toast element is visible with a non-empty error string.
