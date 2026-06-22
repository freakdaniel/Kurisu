# Kurisu Rebranding & Qwen Independence Plan

## Goal

Remove all Qwen branding and dependencies from the project (a fork of Qwen Code), renaming the application to **Kurisu**. Drop the dead Qwen OAuth flow entirely; rely only on OpenAI-Compatible providers. App configuration lives in a project-local `.kurisu` directory (separate from any agent's `.kilocode`, `.claude`, etc.). New logo asset is `assets/logo.png`.

In scope (confirmed with user):
- .NET namespaces, assemblies, project/folder/file rename.
- `.qwen` → `.kurisu` config directory and `.qwenignore` → `.kurisuignore`.
- `QWEN.md` default context file → `KURISU.md`.
- IPC channel prefixes (`qwen-desktop:*`) and TS bridge global/types.
- Full deletion of `QwenOAuth*` types/classes/IPC/UI.
- Logo: drop `qwen-logo.svg`; switch to `assets/logo.png`.

Out of scope:
- Data migration from `~/.qwen` to `~/.kurisu` (no migration).
- Backend runtime (LLM providers) — already OpenAI-Compatible, untouched.
- Native tool hosts (Roslyn LSP, etc.) — keep Qwen-specific routing removed but no replacement.

In-scope follow-up (added in refinement):
- Introduce a **provider preset catalog** modeled on Cline's `BuiltinSpec[]` (see Phase 9) so the user picks from a curated list of OpenAI-Compatible providers (OpenAI, Anthropic-via-OpenAI, DeepSeek, xAI, Groq, Together, Fireworks, OpenRouter, LiteLLM, Vercel AI Gateway, Hugging Face, Mistral, etc.) with default base URL, env-var name, and default model pre-filled.

---

## Target naming

| Concept               | Old                          | New                          |
|-----------------------|------------------------------|------------------------------|
| Solution              | `QwenCode.slnx`              | `Kurisu.slnx`                |
| Projects              | `QwenCode.Core/App/IpcGen/Tests` | `Kurisu.Core/App/IpcGen/Tests` |
| Root namespace        | `QwenCode.Core.*`, `QwenCode.App.*` | `Kurisu.Core.*`, `Kurisu.App.*` |
| AssemblyName          | `QwenCode.Core` / `QwenCode.App` | `Kurisu.Core` / `Kurisu.App` |
| Product name / window | `Qwen Code Desktop`          | `Kurisu`                     |
| User-config dir       | `~/.qwen/`                   | `~/.kurisu/`                 |
| Project-config dir    | `<workspace>/.qwen/`         | `<workspace>/.kurisu/`       |
| Ignore file           | `.qwenignore`                | `.kurisuignore`              |
| Default context file  | `QWEN.md`                    | `KURISU.md`                  |
| Env-var overrides     | `QWEN_RUNTIME_DIR`, `QWEN_CODE_*` | `KURISU_RUNTIME_DIR`, `KURISU_*` |
| ProgramData subfolder | `qwen-code/`                 | `kurisu/`                    |
| Log file name         | `qwen-desktop-.log`          | `kurisu-.log`                |
| Bridge global (TS)    | `window.qwenDesktop`         | `window.kurisuDesktop`       |
| IPC channel const     | `qwenDesktopChannels`        | `kurisuDesktopChannels`      |
| IPC channel prefix    | `qwen-desktop:*`             | `kurisu-desktop:*`           |
| TS DTO types          | `QwenOAuth*`, `QwenRuntimeProfile`, `QwenCompatibility*`, `QwenCommandSurface`, `QwenSkillSurface`, `QwenSurfaceDirectory`, `QwenDesktopBridge` | `KurisuOAuth*`, `KurisuRuntimeProfile`, `KurisuCompatibility*`, `KurisuCommandSurface`, `KurisuSkillSurface`, `KurisuSurfaceDirectory`, `KurisuDesktopBridge` |
| Bootstrap payload fields | `qwenRuntime`, `qwenAuth`, `qwenCompatibility`, `qwenTools`, `qwenNativeHost`, `qwenWorkspace`, `qwenModels`, `qwenMcp`, `qwenExtensions`, `qwenChannels` | `kurisuRuntime`, `kurisuAuth`, `kurisuCompatibility`, `kurisuTools`, `kurisuNativeHost`, `kurisuWorkspace`, `kurisuModels`, `kurisuMcp`, `kurisuExtensions`, `kurisuChannels` |
| Logo assets           | `src/QwenCode.App/Frontend/src/assets/qwen-logo.svg`, `wwwroot/favicon.svg` | `src/Kurisu.App/Frontend/src/assets/logo.png` (PNG only). `favicon.svg` replaced by `assets/logo.svg` produced from `logo.png` OR keep `favicon.svg` pointing at `logo.png` via `<link rel="icon" type="image/png" href="/assets/logo.png" />` |

---

## Provider preset catalog (new in Phase 9)

Modeled on Cline's `OPENAI_COMPATIBLE_SPECS: BuiltinSpec[]` in `sdk/packages/llms/src/providers/builtins.ts`. Each preset carries enough metadata to pre-fill the auth form and write a correct `settings.json` entry with zero manual editing of base URLs.

### BuiltinSpec shape (C# record)

```csharp
public sealed record ProviderPreset(
    string Id,              // e.g. "openai", "deepseek", "xai"
    string Name,            // e.g. "OpenAI", "DeepSeek", "xAI (Grok)"
    string Description,     // one-line tagline
    string Family,          // "openai-compatible" for everything
    string? DefaultBaseUrl, // pre-filled baseUrl
    string? DefaultModelId, // pre-filled model (empty when relying on live fetch)
    IReadOnlyList<string> ApiKeyEnvVars,  // ["OPENAI_API_KEY"], ["HF_TOKEN"], etc.
    IReadOnlyList<string> Capabilities,  // ["tools"], ["reasoning"], ["prompt-cache"]
    int Popularity,         // sort weight; higher = first in picker
    string? DocsUrl,        // link to provider docs
    string? ModelsSourceUrl,// URL for the live model list (OpenAI-Compatible GET {baseUrl}/models; Ollama-style {baseUrl}/api/tags overrides path). Null = manual entry.
    IReadOnlyDictionary<string, string>? ModelsSourceHeaders  // optional headers (Ollama needs none; some providers need Authorization even for listing)
);
```

### Live model list (no hardcoded default)

Per user feedback: the model must be obtained from the provider at runtime, not hardcoded in the preset. Cline does this in `OPENAI_COMPATIBLE_SPECS` via the `modelsSourceUrl` field — Ollama uses `http://localhost:11434/api/tags`; LM Studio uses `http://localhost:1234/v1/models`; for all standard OpenAI-Compatible providers the URL is `{baseUrl}/models`.

In Kurisu:
- Each preset gets a `ModelsSourceUrl`. For the standard `openai-compatible` family it is computed at runtime as `${DefaultBaseUrl}/models` if not explicitly set. For Ollama, it's `http://localhost:11434/api/tags` and a custom JSON path is used (Cline's `model-registry.ts` handles this via `modelsFactory`; we will use a single `GET` + JSON parser that supports both `{"data":[{id}]}` and `{"models":[{name}]}`).
- `Kurisu.Core/Runtime/Providers/ProviderModelLister.cs` exposes `Task<IReadOnlyList<string>> ListAsync(ProviderPreset preset, string? apiKey, CancellationToken)`. It calls the URL, parses the response, and returns model ids.
- The result is cached in `<userKurisuRoot>/model-cache.json` keyed by `${presetId}|${baseUrl}` with a 1-hour TTL. A "Refresh" button forces re-fetch.
- `ModelRegistryService` (existing) is extended to merge live-fetched models with the static `modelProviders` entries from `settings.json`. The list returned to the UI populates the picker.
- If the live fetch fails (no key, 401, network), the UI shows an inline error with a "Retry" button and a "Type model name manually" fallback text input. The user is never blocked.

### Curated preset list (v1)

Mirrors Cline's popular OpenAI-Compatible providers; excludes Cline/Anthropic/Bedrock/Vertex/Codex-specific entries (we are OpenAI-Compatible only). `defaultModelId` is empty for all — the model list is fetched live from `modelsSourceUrl`. `custom` is the manual entry path for advanced users.

| Id             | Name              | Base URL                                  | Env Var               | Popularity | Notes |
|----------------|-------------------|-------------------------------------------|-----------------------|------------|-------|
| `openai`       | OpenAI            | `https://api.openai.com/v1`               | `OPENAI_API_KEY`      | 100        | Default. |
| `anthropic`    | Anthropic (compat)| `https://api.anthropic.com/v1`            | `ANTHROPIC_API_KEY`   | 95         | `modelsSourceUrl` may not return models; fallback to manual. |
| `deepseek`     | DeepSeek          | `https://api.deepseek.com/v1`             | `DEEPSEEK_API_KEY`    | 80         |       |
| `xai`          | xAI (Grok)        | `https://api.x.ai/v1`                     | `XAI_API_KEY`         | 70         |       |
| `groq`         | Groq              | `https://api.groq.com/openai/v1`          | `GROQ_API_KEY`        | 65         |       |
| `openrouter`   | OpenRouter        | `https://openrouter.ai/api/v1`            | `OPENROUTER_API_KEY`  | 90         |       |
| `together`     | Together AI       | `https://api.together.xyz/v1`             | `TOGETHER_API_KEY`    | 50         |       |
| `fireworks`    | Fireworks AI      | `https://api.fireworks.ai/inference/v1`   | `FIREWORKS_API_KEY`   | 45         |       |
| `mistral`      | Mistral           | `https://api.mistral.ai/v1`               | `MISTRAL_API_KEY`     | 55         |       |
| `huggingface`  | Hugging Face      | `https://router.huggingface.co/v1`        | `HF_TOKEN`            | 40         |       |
| `vercel`       | Vercel AI Gateway | `https://ai-gateway.vercel.sh/v1`         | `AI_GATEWAY_API_KEY`  | 35         |       |
| `litellm`      | LiteLLM (self-host)| `http://localhost:4000/v1`               | `LITELLM_API_KEY`     | 30         |       |
| `requesty`     | Requesty          | `https://router.requesty.ai/v1`           | `REQUESTY_API_KEY`    | 25         |       |
| `zai`          | Z.AI (GLM)        | `https://api.z.ai/api/paas/v4`            | `ZHIPU_API_KEY`       | 60         |       |
| `moonshot`     | Moonshot (Kimi)   | `https://api.moonshot.cn/v1`              | `MOONSHOT_API_KEY`    | 45         |       |
| `ollama`       | Ollama            | `http://localhost:11434/v1`               | `OLLAMA_API_KEY`      | 70         | `modelsSourceUrl: http://localhost:11434/api/tags` (custom JSON shape). |
| `custom`       | Custom (manual)   | *(empty, user types)*                     | *(empty)*             | 0          | No live fetch. User types model name. |

Note: this swaps the table from 16 entries to **17 entries** — Ollama was added per the live-fetch discussion. If the user doesn't want Ollama, drop the row.

### Storage format (settings.json)

Selecting a preset writes the following into `<workspace>/.kurisu/settings.json` (no migration from `.qwen/settings.json`):

```json
{
  "security": {
    "auth": {
      "selectedType": "openai",
      "presetId": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "apiKeyEnvironmentVariable": "OPENAI_API_KEY"
    }
  },
  "model": { "name": "gpt-4o-mini" },
  "modelProviders": {
    "openai": [
      {
        "id": "openai",
        "baseUrl": "https://api.openai.com/v1",
        "envKey": "OPENAI_API_KEY",
        "generationConfig": { "contextWindowSize": 128000, "maxOutputTokens": 16384 }
      }
    ]
  }
}
```

If `apiKey` is empty, the runtime resolves it from the env var named in `apiKeyEnvironmentVariable` (current behavior in `AuthFlowService.ResolveHasApiKey`).

### UI flow (Frontend)

1. **AuthScreen** — replaces the single API-key form with:
   - "Provider" combobox/search populated from `kurisuPresets` (returned by bootstrap payload). Default selection: `openai`.
   - On selection, auto-fills `baseUrl` and `apiKeyEnvironmentVariable`. Model is **not** auto-filled — the picker queries the provider's live model list (see below).
   - "Model" combobox: shows the live list returned by `kurisuDesktop.listProviderModels({ presetId, apiKey })`. If the list is empty or the call fails, a manual text input appears with an inline error and a "Retry" button. The error is non-blocking.
   - User pastes the API key into a password field; the list query and the "Save" button stay disabled until a non-empty key is present.
   - "Custom" entry reveals the existing manual base-url + model + env-var fields with no live fetch.
2. **AuthScreen.test.tsx** (new) — covers preset selection, autofill of baseUrl/env var, live list success/failure, custom fallback.
3. **appData.ts** — `fallbackAuth` already initializes `selectedType: "openai"`; no behavioral change.

### Runtime changes (Core)

- Add `Kurisu.Core/Runtime/Providers/ProviderPreset.cs` — record (Id, Name, Description, Family, DefaultBaseUrl, DefaultModelId, ApiKeyEnvVars, Capabilities, Popularity, DocsUrl, ModelsSourceUrl, ModelsSourceHeaders).
- Add `Kurisu.Core/Runtime/Providers/ProviderPresetCatalog.cs` — static `IReadOnlyList<ProviderPreset> Presets` (17 entries per the table above).
- Add `Kurisu.Core/Runtime/Providers/ProviderPresetSnapshot.cs` for IPC transport (subset of fields safe to expose).
- Add `Kurisu.Core/Runtime/Providers/ProviderModelLister.cs` — `Task<IReadOnlyList<string>> ListAsync(ProviderPreset preset, string? apiKey, CancellationToken)`. Calls `ModelsSourceUrl ?? ${DefaultBaseUrl}/models` with optional headers (e.g. `Authorization: Bearer ${apiKey}`). Parses both `{"data":[{"id":...}]}` (OpenAI shape) and `{"models":[{"name":...}]}` (Ollama shape). Caches to `<userKurisuRoot>/model-cache.json` with 1-hour TTL keyed by `${presetId}|${baseUrl}`.
- `BootstrapProjectionService` adds `KurisuProviderPresets: IReadOnlyList<ProviderPresetSnapshot>` to the bootstrap payload.
- New IPC: `ListProviderModels(ListProviderModelsRequest { presetId, apiKey }) -> ListProviderModelsResponse { models: string[], error: string? }`. Authenticated via the API key in the request body (no session storage of the key required).
- `AuthFlowService.ConfigureOpenAiCompatibleAsync` extended: accepts an optional `presetId`. If provided, it auto-fills `baseUrl` and `apiKeyEnvironmentVariable` from the preset; the `model.name` is whatever the user selected from the live list (or typed manually).
- TS type `ConfigureOpenAiCompatibleAuthRequest` gets an optional `presetId?: string`. New type `ListProviderModelsRequest`/`ListProviderModelsResponse`.
- IpcGen regenerates; the new optional field and new request/response types flow to TS.
- `ModelRegistryService` (existing) is extended to merge live-fetched models with the static `modelProviders` entries from `settings.json`. Static entries take precedence for capability flags.

### Validation (Phase 9 additions)

- `dotnet test` covers `ProviderPresetCatalog` (count = 17, all required fields populated, ids unique, baseUrl parseable, popularity descending, all presets except `custom` have a `ModelsSourceUrl` or `DefaultBaseUrl`).
- `dotnet test` covers `ProviderModelLister` with a fake `HttpMessageHandler`: parses both OpenAI-shape and Ollama-shape responses, caches within TTL, returns empty list + error on 401/5xx, never throws to the caller.
- `dotnet test` covers `AuthFlowService`: `ConfigureOpenAiCompatibleAsync` with `presetId='deepseek'` writes `baseUrl=https://api.deepseek.com/v1` and `envKey=DEEPSEEK_API_KEY` into user settings; with `presetId='custom'` no auto-fill happens.
- `Frontend` snapshot of AuthScreen shows provider dropdown with `openai` selected by default.
- E2E: with no env var set, picking a preset and pasting a key still writes a valid `settings.json`; with env var set, the runtime picks up the key without prompting. Live model list call to `https://api.openai.com/v1/models` returns a non-empty list when a real key is provided.
- Failure mode: with an invalid key, the UI shows the inline error and still allows manual model entry. The user is never blocked from saving.

---

## Ordered task list

### Phase 1 — Solution / project skeleton rename

1. Rename folders:
   - `src/QwenCode.Core/` → `src/Kurisu.Core/`
   - `src/QwenCode.App/` → `src/Kurisu.App/`
   - `src/QwenCode.IpcGen/` → `src/Kurisu.IpcGen/`
   - `src/QwenCode.Tests/` → `src/Kurisu.Tests/`
   - Rename `QwenCode.slnx` → `Kurisu.slnx`.
2. In each `.csproj`:
   - Update `<AssemblyName>` to `Kurisu.Core` / `Kurisu.App` / `Kurisu.IpcGen` / `Kurisu.Tests`.
   - Update `<RootNamespace>` to `Kurisu.Core` / `Kurisu.App` / `Kurisu.IpcGen` / `Kurisu.Tests`.
   - Update project references and `<Compile Remove="…\**\*.cs" />` paths to new folder names.
   - In `Kurisu.App.csproj`: change `<Title>` to `Kurisu`, `<Description>` to `Native desktop shell for Kurisu with a fully local .NET runtime and React-based workspace.`, `<Content Include="..\Kurisu.Core\Channels\plugin-host\channel-plugin-host.mjs" …>`.
   - Set `<Product>` and `DefaultProductName` to `Kurisu`.
3. Rewrite `Kurisu.slnx` to point at the new project paths.

### Phase 2 — .NET namespace refactor

4. Globally replace `QwenCode.Core` → `Kurisu.Core` and `QwenCode.App` → `Kurisu.App` and `QwenCode.IpcGen` → `Kurisu.IpcGen` and `QwenCode.Tests` → `Kurisu.Tests` in:
   - `namespace` declarations and `using` directives in every `.cs`.
   - `using QwenCode.…` paths in `Program.cs`, `Bootstrapper.cs`, test files, generators.
   - Logger category strings (e.g. `"QwenCode.App.Bootstrapper"` → `"Kurisu.App.Bootstrapper"`, `"QwenCode.App"` → `"Kurisu.App"`).

### Phase 3 — Branding strings & directory paths

5. In `Kurisu.App/Program.cs`:
   - Default product name `"Qwen Code Desktop"` → `"Kurisu"`.
   - Log file `qwen-desktop-.log` → `kurisu-.log`.
6. In `Kurisu.Core/Infrastructure/Environment/DesktopEnvironmentPaths.cs` — no path changes here (only `HomeDirectory` etc.), but ensure no Qwen strings remain.
7. In `Kurisu.Core/Config/RuntimeConfigService.cs`:
   - `globalQwenDirectory` → `globalKurisuDirectory`; `Path.Combine(environmentPaths.HomeDirectory, ".qwen")` → `Path.Combine(environmentPaths.HomeDirectory, ".kurisu")`.
   - `Path.Combine(projectRoot, ".qwen", "settings.json")` → `Path.Combine(projectRoot, ".kurisu", "settings.json")`.
   - Env vars: `QWEN_CODE_SYSTEM_SETTINGS_PATH` → `KURISU_SYSTEM_SETTINGS_PATH`, `QWEN_CODE_SYSTEM_DEFAULTS_PATH` → `KURISU_SYSTEM_DEFAULTS_PATH`, `QWEN_CODE_TRUSTED_FOLDERS_PATH` → `KURISU_TRUSTED_FOLDERS_PATH`.
   - ProgramData folder `"qwen-code"` → `"kurisu"`.
   - Default `selectedAuthType` fallback: `"openai"` (no qwen-oauth branch).
   - `defaultModelName`: drop the `qwen-oauth` branch; default to `qwen3-coder-plus` or generic `gpt-4o-mini` (Recommended: `qwen3-coder-plus` since OpenAI-Compatible can map to any model name). Decision deferred — see open question.
   - Default `ContextFileNames`: `["QWEN.md", "AGENTS.md"]` → `["KURISU.md", "AGENTS.md"]`.
8. In `Kurisu.Core/Compatibility/Services/QwenRuntimeProfileService.cs`:
   - Rename file/class to `KurisuRuntimeProfileService.cs` / `KurisuRuntimeProfileService`.
   - Replace `GlobalQwenDirectory` → `GlobalKurisuDirectory` (property on `KurisuRuntimeProfile`).
   - `Path.Combine(snapshot.ProjectRoot, fileName)` where fileName from `["QWEN.md","AGENTS.md"]` — keep behavior, default list now starts with `KURISU.md`.
   - Env var `QWEN_RUNTIME_DIR` → `KURISU_RUNTIME_DIR`.
9. In `Kurisu.Core/Compatibility/Services/QwenCompatibilityService.cs`:
   - Rename file/class to `KurisuCompatibilityService.cs` / `KurisuCompatibilityService`.
   - `DefaultContextFileName` const `"QWEN.md"` → `"KURISU.md"`.
   - Surface dirs `.qwen/commands`, `.qwen/skills` → `.kurisu/commands`, `.kurisu/skills`; home `.qwen/skills` → `.kurisu/skills`; default context file path uses `KURISU.md`.
10. In `Kurisu.Core/Infrastructure/Discovery/FileDiscoveryService.cs`:
    - Skip-list: `".qwen"` → `".kurisu"`.
    - `Path.Combine(runtimeProfile.ProjectRoot, ".qwenignore")` → `Path.Combine(runtimeProfile.ProjectRoot, ".kurisuignore")`.
    - Property `GlobalQwenDirectory` → `GlobalKurisuDirectory` on `KurisuRuntimeProfile`.
11. In `Kurisu.Core/Runtime/Prompting/AssistantPromptAssembler.cs`:
    - Default `DefaultContextFileNames`: `["QWEN.md","AGENTS.md"]` → `["KURISU.md","AGENTS.md"]`.
    - `GetDisplayPath` "~/qwen/" → "~/kurisu/".
12. In `Kurisu.Core/Sessions/Hosting/DesktopSessionHostService.cs`:
    - `Path.Combine(runtimeProfile.ProjectRoot, ".qwen", "settings.json")` → `".kurisu"`.
13. In `Kurisu.Core/Sessions/Persistence/DesktopSessionCatalogService.cs` and `Kurisu.App/Desktop/Projection/BootstrapProjectionService.cs`:
    - `globalQwenDirectory` → `globalKurisuDirectory` and `GlobalQwenDirectory` property references.
14. In `Kurisu.App/Desktop/Projection/DesktopProjectionCatalog.cs`: replace description string `"Keep .qwen-compatible settings, memory, session, and tool semantics."` → `"Independent Kurisu runtime with local .kurisu config and OpenAI-Compatible providers."`.
15. In `Kurisu.Core/Runtime/Protocol/OpenAiCompatibleProtocol.cs`: drop the `portal.qwen.ai` special-case (line 309). Replace with a Kurisu-neutral check or remove entirely.

### Phase 4 — QwenOAuth removal

16. Delete files:
    - `Kurisu.Core/Auth/QwenOAuthTokenManager.cs`
    - `Kurisi.Core/Auth/FileQwenOAuthCredentialStore.cs`
    - `Kurisu.Core/Auth/IQwenOAuthTokenManager.cs`
    - `Kurisu.Core/Auth/IQwenOAuthCredentialStore.cs`
    - `Kurisu.Core/Auth/QwenOAuthCredentials.cs` (if separate — confirm in `Models/Auth/`).
17. In `Kurisu.Core/Auth/IAuthFlowService.cs`:
    - Remove `ConfigureQwenOAuthAsync`, `StartQwenOAuthDeviceFlowAsync`, `CancelQwenOAuthDeviceFlowAsync`.
18. In `Kurisu.Core/Auth/AuthFlowService.cs`:
    - Remove corresponding method bodies, the `QwenOAuth*` const block (lines 29-34, 37-41, 174-289, 469+, 745-880).
    - Remove `IQwenOAuthCredentialStore`, `IQwenOAuthTokenManager` ctor params.
    - Remove `HasQwenOAuthCredentials`, `HasRefreshToken`, `DeviceFlow`, `LastAuthenticatedAtUtc` from `AuthStatusSnapshot` initializer, OR retain fields with sensible defaults populated from file-store last-write. Recommended: drop the OAuth-specific fields; keep `LastAuthenticatedAtUtc` driven by selectedType's settings file mtime. Decision: drop OAuth-specific fields (`HasQwenOAuthCredentials`, `HasRefreshToken`, `DeviceFlow`).
19. In `Kurisu.Core/Auth/AuthServiceCollectionExtensions.cs`:
    - Drop `IQwenOAuthCredentialStore` / `IQwenOAuthTokenManager` registrations.
20. In `Kurisi.Core/Models/Auth/`: delete request types `ConfigureQwenOAuthRequest`, `StartQwenOAuthDeviceFlowRequest`, `CancelQwenOAuthDeviceFlowRequest`, `QwenOAuthCredentials`, `QwenOAuthDeviceFlowSnapshot`. Update `AuthStatusSnapshot` to remove `HasQwenOAuthCredentials`, `HasRefreshToken`, `DeviceFlow` (or repurpose `DeviceFlow` field name → remove it).
21. In `Kurisu.App/Desktop/Projection/IDesktopProjectionService.cs`, `IDesktopAuthProjectionService.cs`, `AuthProjectionService.cs`, `DesktopAppService.cs`:
    - Remove `ConfigureQwenOAuthAsync`, `StartQwenOAuthDeviceFlowAsync`, `CancelQwenOAuthDeviceFlowAsync`.
22. In `Kurisu.App/Ipc/Binding/DesktopIpcService.cs`:
    - Remove the three `*QwenOAuth*` IPC handlers.
23. In `Kurisu.App/Frontend/src/components/screens/AuthScreen.tsx`:
    - Remove `handleOAuthLogin` and the OAuth CTA button.
    - Keep only the OpenAI-Compatible API-key flow.
24. Update tests:
    - In all test files, update `.qwen`/`~/.qwen`/`QWEN.md` references to `.kurisu`/`~/.kurisu`/`KURISU.md`.
    - Remove all QwenOAuth-related test code (search `QwenOAuth` across `Kurisu.Tests` and delete fixtures).
    - `Kurisu.Tests/Desktop/DesktopProjectionServiceTests.cs`: update `QwenRuntimeProfileService` → `KurisuRuntimeProfileService`, `QwenCompatibilityService` → `KurisuCompatibilityService`, `FileQwenOAuthCredentialStore`/`QwenOAuthTokenManager` constructor calls removed.

### Phase 5 — TS types, IPC channels, runtime types

25. In `Kurisu.Core/Models/Compatibility/*.cs`:
    - Rename files & classes: `QwenRuntimeProfile` → `KurisuRuntimeProfile`, `QwenCompatibilitySnapshot` → `KurisuCompatibilitySnapshot`, `QwenCompatibilityLayer` → `KurisuCompatibilityLayer`, `QwenSurfaceDirectory` → `KurisuSurfaceDirectory`, `QwenCommandSurface` → `KurisuCommandSurface`, `QwenSkillSurface` → `KurisuSkillSurface`.
    - Update all `GlobalQwenDirectory` → `GlobalKurisuDirectory` properties.
26. In `Kurisu.App/Desktop/Projection/BootstrapProjectionService.cs`:
    - Rename payload properties: `QwenRuntime` → `KurisuRuntime`, `QwenCompatibility` → `KurisuCompatibility`, `QwenTools` → `KurisuTools`, `QwenNativeHost` → `KurisuNativeHost`, `QwenWorkspace` → `KurisuWorkspace`, `QwenAuth` → `KurisuAuth`.
27. In `Kurisu.App/Frontend/src/types/ipc.generated.ts` (will be regenerated by `Kurisu.IpcGen`):
    - Update `TypeScriptEmitter.cs`: replace literal `qwenDesktopChannels` → `kurisuDesktopChannels`, channel prefix string `qwen-desktop:` → `kurisu-desktop:`.
    - Update `IpcMethodCollector.cs`: replace `qwen-desktop:` channel prefix in `ToCamelCase`/Emit logic with `kurisu-desktop:`.
28. Regenerate `Frontend/src/types/ipc.generated.ts` by running `dotnet run --project src/Kurisu.IpcGen`.
29. In `Frontend/src/types/desktop.ts`:
    - Rename type imports `QwenDesktopBridge` → `KurisuDesktopBridge` etc.
    - Rename `window.qwenDesktop?` → `window.kurisuDesktop?`.
30. In `Frontend/src/platform/installDesktopBridge.ts`:
    - Replace `qwenDesktopChannels` → `kurisuDesktopChannels`, `window.qwenDesktop = bridge` → `window.kurisuDesktop = bridge`.
31. In `Frontend/src/appData.ts`:
    - Replace `userQwenRoot: '[user-home]/.qwen'` → `userKurisuRoot: '[user-home]/.kurisu'`.
    - Replace `defaultContextFileName: 'QWEN.md'` → `'KURISU.md'`.
    - Replace `contextFileNames: ['QWEN.md']` → `['KURISU.md']`, `contextFilePaths: [\`.../QWEN.md\`]` → `KURISU.md`.
    - Replace `qwenAuth`, `qwenRuntime`, `qwenCompatibility`, `qwenModels`, etc. keys in `fallbackBootstrap` → `kurisuAuth`, `kurisuRuntime`, `kurisuCompatibility`, `kurisuModels`, etc.
32. In `Frontend/src/hooks/useBootstrap.ts`:
    - Replace all `window.qwenDesktop` → `window.kurisuDesktop`.
    - Replace `fallbackBootstrap.qwenAuth` → `fallbackBootstrap.kurisuAuth`, `payload.qwenAuth` → `payload.kurisuAuth`, etc.
33. Sweep across `Frontend/src/**/*.{ts,tsx}`:
    - Replace `window.qwenDesktop` → `window.kurisuDesktop`.
    - Replace `bootstrap?.qwenRuntime` → `bootstrap?.kurisuRuntime`, `bootstrap?.qwenAuth` → `bootstrap?.kurisuAuth`, `bootstrap?.qwenCompatibility` → `bootstrap?.kurisuCompatibility`, `bootstrap?.qwenModels` → `bootstrap?.kurisuModels`.
    - Files known to touch these: `ChatArea.tsx`, `MainLayout.tsx`, `TitleBar.tsx`, `Sidebar.tsx`, `DirectConnectPanel.tsx`, `WindowResizeHandles.tsx`, `AuthScreen.tsx`, `App.tsx`.

### Phase 6 — Logo & Frontend assets

34. Delete `src/Kurisu.App/Frontend/src/assets/qwen-logo.svg` and `src/Kurisu.App/wwwroot/assets/qwen-logo.svg` (if copied) and `wwwroot/favicon.svg` (replace with logo).
35. Place `logo.png`:
    - Already exists at `src/Kurisu.App/Frontend/src/assets/logo.png` — keep.
    - Add to `src/Kurisu.App/wwwroot/assets/logo.png` so the Vite output bundles it.
36. In `Frontend/index.html`:
    - `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` → `<link rel="icon" type="image/png" href="/assets/logo.png" />`.
    - `<title>qwencode-desktop-renderer</title>` → `<title>Kurisu</title>`.
37. In `Frontend/package.json`:
    - `"name": "qwencode-desktop-renderer"` → `"name": "kurisu-desktop-renderer"`.
38. Replace logo imports in TSX:
    - `Sidebar.tsx`, `ChatArea.tsx`, `TitleBar.tsx`, `AuthScreen.tsx`, `App.tsx`: `import qwenLogo from '@/assets/qwen-logo.svg'` → `import kurisuLogo from '@/assets/logo.png'`. Update JSX `<img src={qwenLogo} alt="Qwen" />` → `<img src={kurisuLogo} alt="Kurisu" />`.

### Phase 7 — Tooling & misc

39. `Kurisu.App/AppHost/Bootstrapper.cs`: logger category `"QwenCode.App.Bootstrapper"` → `"Kurisu.App.Bootstrapper"`.
40. `toc.yml`, `docfx.json`: update project names if they reference QwenCode.
41. `LICENSE` / `README.md` (if present in `E:\Projects\Kurisu\docs`): update any QwenCode references.
42. Delete `.qwen/` repo-local folder if present (not a concern; repo only has `.kilo`, `.claude`).

### Phase 9 — Provider preset catalog (new feature)

49. Add `Kurisu.Core/Runtime/Providers/ProviderPreset.cs` record (Id, Name, Description, Family, DefaultBaseUrl, DefaultModelId, ApiKeyEnvVars, Capabilities, Popularity, DocsUrl, ModelsSourceUrl, ModelsSourceHeaders).
50. Add `Kurisu.Core/Runtime/Providers/ProviderPresetCatalog.cs` with the static preset list (17 entries per the table above; `defaultModelId` empty for all; `ollama` uses `modelsSourceUrl=http://localhost:11434/api/tags`).
51. Add `Kurisu.Core/Models/Providers/ProviderPresetSnapshot.cs` for IPC transport (subset safe to expose).
52. Add `Kurisu.Core/Runtime/Providers/ProviderModelLister.cs`:
    - `Task<ListProviderModelsResult> ListAsync(ProviderPreset preset, string? apiKey, CancellationToken)`.
    - Computes URL: `preset.ModelsSourceUrl ?? $"{preset.DefaultBaseUrl?.TrimEnd('/')}/models"`.
    - Sets headers: `Authorization: Bearer {apiKey}` when non-empty; custom headers from `ModelsSourceHeaders`.
    - Parses response: `data[]` → `.id`, or `models[]` → `.name`. Returns `string[]` plus an `Error` string on non-2xx.
    - Caches to `<userKurisuRoot>/model-cache.json` with **1-hour TTL** keyed by `${preset.Id}|${url}`. `ForceRefresh` skips the cache. Cache writes are atomic (write to `.tmp` + rename).
    - **Anthropic fallback**: if `preset.Id == "anthropic"` and the live response is empty or errors, return the hardcoded list `["claude-3-5-sonnet-latest", "claude-3-7-sonnet-latest", "claude-sonnet-4", "claude-opus-4"]` with `Error = "Using fallback model list"`. UI still shows the inline error banner.
    - **Ollama**: `modelsSourceUrl = http://localhost:11434/api/tags` returns `{"models":[{"name":"..."}]}` — already supported by the second parse branch.
53. `BootstrapProjectionService.cs`: add `KurisuProviderPresets: IReadOnlyList<ProviderPresetSnapshot>` field, populated from `ProviderPresetCatalog.Presets`.
54. `ConfigureOpenAiCompatibleAuthRequest` (CS+TS): add optional `presetId: string?`. In `AuthFlowService.ConfigureOpenAiCompatibleAsync`, if `presetId` is non-empty, look it up in `ProviderPresetCatalog` and auto-fill `baseUrl` and `apiKeyEnvironmentVariable`. The model name is whatever the user selected (live or manual). User-supplied non-empty values still win.
55. New IPC handler `IDesktopProjectionService.ListProviderModelsAsync(ListProviderModelsRequest)` and `IDesktopAuthProjectionService` projection. Request: `{ presetId, apiKey }`. Response: `{ models: string[], error: string? }`. Implementation calls `ProviderModelLister.ListAsync`.
56. `Kurisi.App/Desktop/Projection/IDesktopProjectionService.cs` and `DesktopAppService.cs`: add the new method.
57. `Kurisi.App/Ipc/Binding/DesktopIpcService.cs`: add the IPC handler. Channel name: `kurisu-desktop:auth:list-provider-models`.
58. Regenerate `ipc.generated.ts` via `dotnet run --project src/Kurisu.IpcGen`.
59. `Frontend/src/types/desktop.ts`: export `ProviderPresetSnapshot`, `ListProviderModelsRequest`, `ListProviderModelsResponse`. `fallbackBootstrap` adds `kurisuProviderPresets: ProviderPresetSnapshot[]` (default `[]`).
60. `appData.ts`: add `fallbackPresets: ProviderPresetSnapshot[] = []`. The bootstrap field defaults to `[]` and is populated when the payload arrives.
61. Refactor `AuthScreen.tsx`:
   - Add `Select` control bound to `bootstrap.kurisuProviderPresets`, defaulting to the entry with `id === 'openai'`.
   - On selection, set `baseUrl` and `apiKeyEnvironmentVariable` from the preset.
   - Add a second `Select` ("Model") populated by `kurisuDesktop.listProviderModels({ presetId, apiKey })`. Show a spinner while loading; on error show an inline error with a "Retry" button. Always offer a free-text fallback input.
   - Pass `presetId` and the chosen `model` to `kurisuDesktop.configureOpenAiCompatibleAuth`.
   - "Custom" entry reveals the existing manual base-url + model + env-var fields with no live fetch.
   - The OAuth button stays removed (per Phase 4 #23).
62. Extend `ModelRegistryService` to merge live-fetched models (via `ProviderModelLister`) with static `modelProviders` entries from `settings.json`. Static entries win for capability flags.
63. Tests (Core): `Kurisu.Tests/Runtime/ProviderPresetCatalogTests.cs` — count = 17, uniqueness, popularity descending, `custom` has no `ModelsSourceUrl`, all others do.
64. Tests (Core): `Kurisu.Tests/Runtime/ProviderModelListerTests.cs` — fake `HttpMessageHandler`, parses both JSON shapes, caches within TTL, returns empty + error on 401, never throws, Anthropic preset falls back to hardcoded list on empty/error, Ollama preset parses `models[]` shape.
65. Tests (Core): `Kurisu.Tests/Auth/AuthFlowServicePresetTests.cs` — `presetId='deepseek'` auto-fills baseUrl + envKey; `presetId='custom'` does not auto-fill.
66. Tests (Frontend): `AuthScreen.test.tsx` — default selection is `openai`, autofill of baseUrl/env var, live list loading/error/success states, custom fallback visible when `custom` selected.

### Phase 8 — Validation

43. Build backend: `dotnet build Kurisu.slnx` — must compile with zero warnings about missing types.
44. Run tests: `dotnet test Kurisu.Tests/Kurisu.Tests.csproj` — must pass; tests referencing OAuth removed.
45. Generate IPC types: `dotnet run --project src/Kurisu.IpcGen` — must produce `Frontend/src/types/ipc.generated.ts` with `kurisuDesktopChannels` and `kurisu-desktop:*` channels.
46. Lint frontend: `npm run lint` inside `Frontend`.
47. Build frontend: `npm run build` — confirm bundle includes `assets/logo.png` and no `qwen-logo.svg` references.
48. Smoke run desktop host (`dotnet run --project src/Kurisu.App`) — confirm:
    - Window title is `Kurisu`.
    - Log file is `kurisu-*.log` (not `qwen-desktop-*.log`).
    - Bootstrap payload contains `kurisuRuntime`, `kurisuAuth`, `kurisuCompatibility`, no `qwen*` keys.
    - `.kurisu/` folder created in user home on first config save; `.qwen/` not touched.
    - Auth screen shows only the API-key flow.

---

## Risks & notes

- **IPC channel string is a wire contract.** Renaming `qwen-desktop:*` → `kurisu-desktop:*` will break any external DirectConnect integrations expecting the old prefix. Acceptable since the project is private and unannounced.
- **TS generated file is the single source of truth for many frontend type names.** After renaming C# types, regenerate `ipc.generated.ts` once and rely on it; do not hand-edit.
- **`QwenOAuthCredentials` deletion will surface as `using` errors in remaining code** (`AuthProjectionService`, `AuthFlowService`). Resolve by deleting any field/property that referenced it (see Phase 4 #18).
- **`AssemblyName` change**: anyone consuming `QwenCode.Core.dll` directly (tests, plugins) must update their references — only `Kurisu.Tests` references it currently.
- **Settings file location changes** (`~/.qwen/settings.json` → `~/.kurisu/settings.json`). Without migration, any prior user setup is silently lost. Per user decision: acceptable.
- **`OpenAiCompatibleProtocol.cs` line 309** (`portal.qwen.ai` host check): removing it is a behavior change for any user currently pointing at that domain via custom base URL. Safe since we no longer support Qwen OAuth anyway.
- **`Kurisu.Core/Models/Auth`** directory may contain additional OAuth types — confirm and delete all unreferenced ones after Phase 4.

---

## Open questions

Resolved during refinement:
- ✅ **Preset list (v1)**: full 17-entry list (incl. Ollama).
- ✅ **Default preset on first run**: `openai` is hardcoded as the default. No env-var sniffing.
- ✅ **Favicon**: `<link rel="icon" type="image/png" href="/assets/logo.png" />`. Delete `wwwroot/favicon.svg`.
- ✅ **Default model name**: no hardcoded default for any preset. Models come from the provider's live `/v1/models` (or Ollama `/api/tags`). The only exception is `anthropic`, which gets a small hardcoded fallback list (see Anthropic resolution below).
- ✅ **Model list cache TTL**: 1 hour, persisted to `<userKurisuRoot>/model-cache.json` keyed by `${preset.Id}|${url}`. A "Refresh" button in the UI calls `ForceRefresh` and bypasses the cache.
- ✅ **Error UI on /v1/models failure**: inline red banner with the error message, a "Retry" button next to it, and a free-text "Type model name manually" input always visible. Save is never blocked.
- ✅ **Anthropic `/v1/models`**: hardcoded short list of current models — `claude-3-5-sonnet-latest`, `claude-3-7-sonnet-latest`, `claude-sonnet-4`, `claude-opus-4`. Used as the picker contents for the `anthropic` preset; the lister still attempts a live fetch first and falls back to this list on failure or empty result.

Open: none.
