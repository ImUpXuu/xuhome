function findMatchingBrace(css, openIndex) {
  let depth = 0;
  let quote = '';
  let comment = false;

  for (let i = openIndex; i < css.length; i += 1) {
    const char = css[i];
    const next = css[i + 1];

    if (comment) {
      if (char === '*' && next === '/') {
        comment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '*') {
      comment = true;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function removeAtRuleBlocks(css, pattern) {
  let output = css;
  let match;

  while ((match = output.match(pattern))) {
    const start = match.index;
    const open = output.indexOf('{', start + match[0].length - 1);
    if (open < 0) break;
    const close = findMatchingBrace(output, open);
    if (close < 0) break;
    output = output.slice(0, start) + output.slice(close + 1);
  }

  return output;
}

function unwrapAtRuleBlocks(css, pattern) {
  let output = css;
  let match;

  while ((match = output.match(pattern))) {
    const start = match.index;
    const open = output.indexOf('{', start + match[0].length - 1);
    if (open < 0) break;
    const close = findMatchingBrace(output, open);
    if (close < 0) break;
    output = output.slice(0, start) + output.slice(open + 1, close) + output.slice(close + 1);
  }

  return output;
}

function stripModernAtRules(css) {
  let output = css.replace(/@layer\b[^;{]*;/gi, '');
  output = unwrapAtRuleBlocks(output, /@layer\b[^;{]*\{/i);
  output = removeAtRuleBlocks(output, /@property\b[^{}]*\{/i);
  // Only remove feature queries that old Android WebViews cannot parse;
  // keep unrelated @supports blocks because they may contain useful fallbacks.
  output = removeAtRuleBlocks(
    output,
    /@supports\s*\([^{}]*(?:color\s*:\s*color-mix|rgb\s*\(from|margin-trim\s*:|contain-intrinsic-size\s*:|-webkit-appearance\s*:\s*-apple-pay-button)[^{}]*\{/i,
  );
  return output;
}

function channelToHex(channel) {
  return Math.max(0, Math.min(255, Math.round(channel * 255)))
    .toString(16)
    .padStart(2, '0');
}

function oklabToHex(lightnessToken, aToken, bToken) {
  const lightness = parseFloat(lightnessToken) / (lightnessToken.endsWith('%') ? 100 : 1);
  const a = parseFloat(aToken);
  const b = parseFloat(bToken);
  if (![lightness, a, b].every(Number.isFinite)) return null;

  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
  const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSrgb = (value) => {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return `#${channelToHex(toSrgb(red))}${channelToHex(toSrgb(green))}${channelToHex(toSrgb(blue))}`;
}

function oklchToHex(lightnessToken, chromaToken, hueToken) {
  const lightness = parseFloat(lightnessToken) / (lightnessToken.endsWith('%') ? 100 : 1);
  const chroma = parseFloat(chromaToken);
  const hue = parseFloat(hueToken) * Math.PI / 180;
  if (![lightness, chroma, hue].every(Number.isFinite)) return null;
  return oklabToHex(
    String(lightness),
    String(chroma * Math.cos(hue)),
    String(chroma * Math.sin(hue)),
  );
}

function replaceModernColors(css) {
  let output = css.replace(
    /oklch\(\s*([+-]?(?:\d*\.\d+|\d+\.?\d*)%?)\s+([+-]?(?:\d*\.\d+|\d+\.?\d*))\s+([+-]?(?:\d*\.\d+|\d+\.?\d*)(?:deg|grad|rad|turn)?)\s*\)/gi,
    (full, lightness, chroma, hueToken) => {
      let hue = parseFloat(hueToken);
      if (/grad$/i.test(hueToken)) hue *= 0.9;
      if (/rad$/i.test(hueToken)) hue *= 180 / Math.PI;
      if (/turn$/i.test(hueToken)) hue *= 360;
      return oklchToHex(lightness, chroma, String(hue)) || full;
    },
  );

  output = output.replace(
    /oklab\(\s*([+-]?(?:\d*\.\d+|\d+\.?\d*)%?)\s+([+-]?(?:\d*\.\d+|\d+\.?\d*))\s+([+-]?(?:\d*\.\d+|\d+\.?\d*))(?:\s*\/\s*([+-]?(?:\d*\.\d+|\d+\.?\d*)%?))?\s*\)/gi,
    (full, lightness, a, b, alphaToken) => {
      const hex = oklabToHex(lightness, a, b);
      if (!hex) return full;
      if (!alphaToken) return hex;
      const alpha = parseFloat(alphaToken) / (alphaToken.endsWith('%') ? 100 : 1);
      return Number.isFinite(alpha) ? `${hex}${channelToHex(alpha)}` : hex;
    },
  );

  return output;
}

export function downgradeLegacyCss(css) {
  if (typeof css !== 'string' || !css) return css;
  return replaceModernColors(stripModernAtRules(css));
}

export function legacyCssCompat() {
  return {
    name: 'legacy-css-compat',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.css')) continue;
        if (typeof asset.source !== 'string') continue;
        asset.source = downgradeLegacyCss(asset.source);
      }
    },
  };
}

export default legacyCssCompat;
