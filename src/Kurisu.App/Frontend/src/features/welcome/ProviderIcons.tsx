import type { CSSProperties, ImgHTMLAttributes } from 'react';

import aihubmixUrl from '@/assets/brands/aihubmix-icon.svg';
import anthropicUrl from '@/assets/brands/claude-ai-icon.svg';
import asksageUrl from '@/assets/brands/asksage.png';
import bedrockUrl from '@/assets/brands/aws-amazon-bedrock-icon.svg';
import basetenUrl from '@/assets/brands/baseten-logo.svg';
import cerebrasUrl from '@/assets/brands/cerebras-icon.svg';
import deepseekUrl from '@/assets/brands/deepseek-logo-icon.svg';
import difyUrl from '@/assets/brands/dify.png';
import doubaoUrl from '@/assets/brands/doubao-icon.svg';
import fireworksUrl from '@/assets/brands/fireworks-ai-icon.svg';
import geminiUrl from '@/assets/brands/google-gemini-icon.svg';
import groqUrl from '@/assets/brands/groq-icon.svg';
import hicapUrl from '@/assets/brands/hicap-ai-icon.svg';
import huggingfaceUrl from '@/assets/brands/huggingface-icon.svg';
import huaweiUrl from '@/assets/brands/huawei-mass.png';
import kilocodeUrl from '@/assets/brands/kilo.png';
import kimiUrl from '@/assets/brands/kimi-ai-icon.svg';
import litellmUrl from '@/assets/brands/litellm.png';
import lmstudioUrl from '@/assets/brands/lm-studio.png';
import minimaxUrl from '@/assets/brands/minimax-icon.svg';
import mistralUrl from '@/assets/brands/mistral-ai-icon.svg';
import nebiusUrl from '@/assets/brands/nebius.png';
import nousUrl from '@/assets/brands/nous.png';
import ollamaUrl from '@/assets/brands/ollama-icon.svg';
import openaiUrl from '@/assets/brands/openai-icon.svg';
import openrouterUrl from '@/assets/brands/openrouter-icon.svg';
import poolsideUrl from '@/assets/brands/poolside.png';
import qwenUrl from '@/assets/brands/qwen.png';
import requestyUrl from '@/assets/brands/requesty-logo.svg';
import sambanovaUrl from '@/assets/brands/sambanova.png';
import sapaicoreUrl from '@/assets/brands/sap-ai.png';
import togetherUrl from '@/assets/brands/together-ai-icon.svg';
import vercelUrl from '@/assets/brands/vercel-icon.svg';
import vertexUrl from '@/assets/brands/vertex-ai-icon.svg';
import wandbUrl from '@/assets/brands/weights-biases.png';
import xaiUrl from '@/assets/brands/grok-ai-icon.svg';
import xiaomiUrl from '@/assets/brands/xiaomi.png';
import zaiUrl from '@/assets/brands/z-ai-icon.svg';

import { AdwaitaIcon } from '@/components/ui/AdwaitaIcon';
import { adwaitaIconSources, type AdwaitaIconKey } from '@/components/ui/adwaitaIconSources';

import { needsLightTile } from './providerTheme';

type ImgProps = ImgHTMLAttributes<HTMLImageElement>;

/**
 * Resolves a provider wire-id to either a bundled brand asset URL or an
 * Adwaita icon key. Image-backed providers render via `<img src>` so the
 * brand mark is crisp at any size; Adwaita-keyed providers render via
 * `<AdwaitaIcon>` so the icon follows the active theme/foreground colour.
 */
type BrandIcon =
  | { kind: 'image'; src: string }
  | { kind: 'adwaita'; key: AdwaitaIconKey };

/**
 * Maps a provider wire-id (matches `Kurisu.Core.Infrastructure.Constants.
 * ProviderIds` in the backend) to the bundled brand asset under
 * `@/assets/brands/`. Providers without an asset fall through to the
 * "?" letter-avatar fallback in `ProviderIcon` below.
 *
 * Aliases:
 *   • `openai-native` / `openai-codex` share the OpenAI mark.
 *   • `claude-code` shares the Anthropic mark.
 *   • `dashscope` shares the Qwen mark (DashScope is the Alibaba endpoint
 *     that serves Qwen via the OpenAI-compatible path).
 *   • `custom` uses the Adwaita `network-server` symbol — a "bring your own
 *     server" affordance for users connecting to a hand-rolled endpoint.
 */
const brandIcons: Record<string, BrandIcon> = {
  // First-party — OpenAI family
  openai: { kind: 'image', src: openaiUrl },
  'openai-native': { kind: 'image', src: openaiUrl },
  'openai-codex': { kind: 'image', src: openaiUrl },
  // First-party — Anthropic family
  anthropic: { kind: 'image', src: anthropicUrl },
  'claude-code': { kind: 'image', src: anthropicUrl },
  // Cloud
  bedrock: { kind: 'image', src: bedrockUrl },
  vertex: { kind: 'image', src: vertexUrl },
  gemini: { kind: 'image', src: geminiUrl },
  // Local
  ollama: { kind: 'image', src: ollamaUrl },
  lmstudio: { kind: 'image', src: lmstudioUrl },
  // Aggregators / gateways
  openrouter: { kind: 'image', src: openrouterUrl },
  'vercel-ai-gateway': { kind: 'image', src: vercelUrl },
  minimax: { kind: 'image', src: minimaxUrl },
  // Major vendors
  deepseek: { kind: 'image', src: deepseekUrl },
  xai: { kind: 'image', src: xaiUrl },
  groq: { kind: 'image', src: groqUrl },
  mistral: { kind: 'image', src: mistralUrl },
  together: { kind: 'image', src: togetherUrl },
  fireworks: { kind: 'image', src: fireworksUrl },
  moonshot: { kind: 'image', src: kimiUrl },
  huggingface: { kind: 'image', src: huggingfaceUrl },
  litellm: { kind: 'image', src: litellmUrl },
  requesty: { kind: 'image', src: requestyUrl },
  zai: { kind: 'image', src: zaiUrl },
  cerebras: { kind: 'image', src: cerebrasUrl },
  sambanova: { kind: 'image', src: sambanovaUrl },
  nebius: { kind: 'image', src: nebiusUrl },
  baseten: { kind: 'image', src: basetenUrl },
  poolside: { kind: 'image', src: poolsideUrl },
  hicap: { kind: 'image', src: hicapUrl },
  aihubmix: { kind: 'image', src: aihubmixUrl },
  nousResearch: { kind: 'image', src: nousUrl },
  wandb: { kind: 'image', src: wandbUrl },
  xiaomi: { kind: 'image', src: xiaomiUrl },
  kilocode: { kind: 'image', src: kilocodeUrl },
  qwen: { kind: 'image', src: qwenUrl },
  dashscope: { kind: 'image', src: qwenUrl },
  doubao: { kind: 'image', src: doubaoUrl },
  asksage: { kind: 'image', src: asksageUrl },
  dify: { kind: 'image', src: difyUrl },
  sapaicore: { kind: 'image', src: sapaicoreUrl },
  'huawei-cloud-maas': { kind: 'image', src: huaweiUrl },
  custom: { kind: 'adwaita', key: 'networkServer' },
  // `v0` and `oca` have no bundled asset — render the "?" letter avatar.
};

/**
 * Wrapper for a brand icon. Every render path — branded icon, white-tile
 * branded icon, letter-avatar fallback — fills the same outer `width × height`
 * box with `borderRadius: 6`. The inner <img> uses `width: 100%; height: 100%`
 * so dark icons that need a white tile are no longer smaller than colored
 * icons, matching what the user asked for.
 */
export function ProviderIcon({ id, style, ...props }: ImgProps & { id: string }) {
  const width = typeof props.width === 'number' ? props.width : 22;
  const height = typeof props.height === 'number' ? props.height : 22;
  const icon = brandIcons[id];
  const onLightTile = needsLightTile(id);

  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${width}px`,
    height: `${height}px`,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
    background: onLightTile ? '#FFFFFF' : 'transparent',
    ...style,
  };

  if (icon) {
    if (icon.kind === 'image') {
      return (
        <span {...(props as Record<string, unknown>)} style={wrapperStyle}>
          <img
            src={icon.src}
            alt={id}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </span>
      );
    }
    return (
      <span {...(props as Record<string, unknown>)} style={wrapperStyle}>
        <AdwaitaIcon source={adwaitaIconSources[icon.key]} size={Math.min(width, height)} />
      </span>
    );
  }

  return (
    <span
      {...(props as Record<string, unknown>)}
      style={{
        ...wrapperStyle,
        fontWeight: 700,
        fontSize: Math.max(10, Math.round(width * 0.55)),
        color: onLightTile ? '#000' : 'currentColor',
        border: onLightTile ? 'none' : '1px solid rgba(255,255,255,0.12)',
        background: onLightTile ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      }}
    >
      ?
    </span>
  );
}
