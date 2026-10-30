function round1(value) {
  return Math.round(value * 10) / 10;
}

function px(value) {
  return `${round1(value)}px`;
}

function hexToRgb(hex) {
  if (typeof hex !== "string") {
    return null;
  }

  const value = hex.trim().replace("#", "");

  if (!/^[0-9a-f]{6}$/i.test(value)) {
    return null;
  }

  const number = parseInt(value, 16);

  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function colorDistance(first, second) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);

  if (!a || !b) {
    return null;
  }

  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function sameText(first, second) {
  return (
    String(first || "").trim().toLowerCase() ===
    String(second || "").trim().toLowerCase()
  );
}

// Browser layout and Figma both produce sub-pixel floats; half a pixel is not a visible difference.
function sameNumber(first, second) {
  return (
    typeof first === "number" &&
    typeof second === "number" &&
    Math.abs(first - second) < 0.5
  );
}

function sameColor(first, second) {
  const distance = colorDistance(first, second);

  if (distance === null) {
    return sameText(first, second);
  }

  return distance <= 6;
}

function isNum(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/* ---------- Tailwind mapping ----------
 * Only emits a named utility when it is exact in Tailwind's default theme
 * (same value in v3 and v4, assuming a 16px root font size). Everything else
 * uses an arbitrary value so the class never means something different.
 */

const SPACING_TOKENS = {
  0: "0", 1: "px", 2: "0.5", 4: "1", 6: "1.5", 8: "2", 10: "2.5", 12: "3",
  14: "3.5", 16: "4", 20: "5", 24: "6", 28: "7", 32: "8", 36: "9", 40: "10",
  44: "11", 48: "12", 56: "14", 64: "16", 80: "20", 96: "24",
};

const WEIGHT_TOKENS = {
  100: "thin", 200: "extralight", 300: "light", 400: "normal", 500: "medium",
  600: "semibold", 700: "bold", 800: "extrabold", 900: "black",
};

function spacingToken(value) {
  const rounded = round1(value);
  return Number.isInteger(rounded) && SPACING_TOKENS[rounded] !== undefined
    ? SPACING_TOKENS[rounded]
    : `[${px(value)}]`;
}

function twFontFamily(value) {
  const name = String(value).trim().replace(/['"]/g, "").replace(/\s+/g, "_");
  return `font-['${name}']`;
}

function twFontWeight(value) {
  return WEIGHT_TOKENS[value] ? `font-${WEIGHT_TOKENS[value]}` : `font-[${value}]`;
}

function twRadius(value) {
  if (round1(value) === 0) return "rounded-none";
  if (value >= 9999) return "rounded-full";
  return `rounded-[${px(value)}]`;
}

function twPadding(sides) {
  const [top, right, bottom, left] = sides.map(spacingToken);

  if (top === right && right === bottom && bottom === left) {
    return [`p-${top}`];
  }

  if (top === bottom && left === right) {
    return [`px-${left}`, `py-${top}`];
  }

  return [`pt-${top}`, `pr-${right}`, `pb-${bottom}`, `pl-${left}`];
}

function cssRule(selector, declarations) {
  const entries = Object.entries(declarations);

  if (entries.length === 0) {
    return "";
  }

  const body = entries
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n");

  return `${selector} {\n${body}\n}`;
}

function paddingSides(source, prefix) {
  const keys = ["Top", "Right", "Bottom", "Left"].map((side) => `${prefix}${side}`);
  const values = keys.map((key) => source[key]);
  return values.every(isNum) ? values : null;
}

function buildStyleFixes(element, spec) {
  const fixes = [];
  const cssFixes = {};
  const targetCss = {};
  const tailwindClasses = [];
  const tailwindFixClasses = [];

  function add({ property, cssProperty, current, expected, formatter = String, equal, tailwind }) {
    if (expected === undefined || expected === null) {
      return;
    }

    const expectedValue = formatter(expected);
    const classes = tailwind ? [].concat(tailwind(expected)) : [];

    targetCss[cssProperty] = expectedValue;
    tailwindClasses.push(...classes);

    if (current === undefined || current === null || current === "") {
      return;
    }

    if (equal(current, expected)) {
      return;
    }

    fixes.push({
      property,
      css_property: cssProperty,
      current: formatter(current),
      expected: expectedValue,
      tailwind: classes,
    });

    cssFixes[cssProperty] = expectedValue;
    tailwindFixClasses.push(...classes);
  }

  add({
    property: "fontFamily",
    cssProperty: "font-family",
    current: element.fontFamily,
    expected: spec.fontFamily,
    formatter: (value) => (/\s/.test(value) ? `"${value}"` : String(value)),
    equal: (a, b) => sameText(String(a).replace(/"/g, ""), String(b).replace(/"/g, "")),
    tailwind: twFontFamily,
  });

  add({
    property: "fontSize",
    cssProperty: "font-size",
    current: element.fontSize,
    expected: spec.fontSize,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `text-[${px(value)}]`,
  });

  add({
    property: "fontWeight",
    cssProperty: "font-weight",
    current: element.fontWeight,
    expected: spec.fontWeight,
    formatter: String,
    equal: sameNumber,
    tailwind: twFontWeight,
  });

  add({
    property: "color",
    cssProperty: "color",
    current: element.color,
    expected: spec.color,
    formatter: String,
    equal: sameColor,
    tailwind: (value) => `text-[${value}]`,
  });

  add({
    property: "background",
    cssProperty: "background-color",
    current: element.background,
    expected: spec.background,
    formatter: String,
    equal: sameColor,
    tailwind: (value) => `bg-[${value}]`,
  });

  // Padding: use all four sides when both sides of the comparison have them,
  // otherwise fall back to the older single averaged value.
  const elementSides = paddingSides(element, "padding");
  const specSides = paddingSides(spec, "padding");

  if (elementSides && specSides) {
    add({
      property: "padding",
      cssProperty: "padding",
      current: elementSides,
      expected: specSides,
      formatter: (sides) => sides.map(px).join(" "),
      equal: (a, b) => a.every((value, index) => sameNumber(value, b[index])),
      tailwind: twPadding,
    });
  } else {
    add({
      property: "padding",
      cssProperty: "padding",
      current: element.padding,
      expected: spec.padding,
      formatter: px,
      equal: sameNumber,
      tailwind: (value) => `p-${spacingToken(value)}`,
    });
  }

  add({
    property: "gap",
    cssProperty: "gap",
    current: element.gap,
    expected: spec.gap,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `gap-${spacingToken(value)}`,
  });

  add({
    property: "width",
    cssProperty: "width",
    current: element.width,
    expected: spec.width,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `w-[${px(value)}]`,
  });

  add({
    property: "height",
    cssProperty: "height",
    current: element.height,
    expected: spec.height,
    formatter: px,
    equal: sameNumber,
    tailwind: (value) => `h-[${px(value)}]`,
  });

  add({
    property: "borderRadius",
    cssProperty: "border-radius",
    current: element.borderRadius ?? element.cornerRadius,
    expected: spec.cornerRadius,
    formatter: px,
    equal: sameNumber,
    tailwind: twRadius,
  });

  const selector = element.selector || ".selected-element";

  return {
    suggested_fixes: fixes,
    css_fixes: cssFixes,
    css_fix_rule: cssRule(selector, cssFixes),
    target_css: targetCss,
    target_css_rule: cssRule(selector, targetCss),
    tailwind_classes: tailwindClasses,
    tailwind_fix_classes: tailwindFixClasses,
  };
}

module.exports = {
  buildStyleFixes,
  spacingToken,
};
