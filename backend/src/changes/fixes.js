// CSS properties that Parity is allowed to commit.
const properties = {
  color: "color",
  backgroundColor: "background-color",
  fontFamily: "font-family",
  fontSize: "font-size",
  borderRadius: "border-radius",
  fontWeight: "font-weight",
  padding: "padding",
  gap: "gap",
  width: "width",
  height: "height",
  marginTop: "margin-top",
  marginRight: "margin-right",
  marginBottom: "margin-bottom",
  marginLeft: "margin-left",
  paddingTop: "padding-top",
  paddingRight: "padding-right",
  paddingBottom: "padding-bottom",
  paddingLeft: "padding-left",
};

const allowedProperties = new Set(Object.values(properties));

function validateFix(fix) {
  if (
    !fix ||
    typeof fix.selector !== "string" ||
    !fix.selector ||
    fix.selector.length > 1500 ||
    /[{}\n\r\u0000]/.test(fix.selector)
  ) {
    throw new Error("Invalid selector");
  }

  if (!allowedProperties.has(fix.property)) {
    throw new Error("Unsupported CSS property");
  }

  const value = String(fix.value);

  if (value.length > 300 || /[;{}\n\r\u0000]/.test(value)) {
    throw new Error("Unsupported CSS value");
  }

  let valid = false;

  if (["color", "background-color"].includes(fix.property)) {
    valid =
      /^(#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(value);
  } else if (fix.property === "font-weight") {
    valid = /^(normal|bold|[1-9]00)$/.test(value);
  } else if (fix.property === "font-family") {
    valid = /^[A-Za-z0-9 _,'".-]+$/.test(value);
  } else if (fix.property === "padding") {
    // 1–4 values, e.g. "12px" or "8px 16px 8px 16px"
    valid = /^(0|\d+(\.\d+)?px)( (0|\d+(\.\d+)?px)){0,3}$/.test(value);
  } else {
    valid = /^(0|\d+(\.\d+)?px)$/.test(value);
  }

  if (!valid) {
    throw new Error("Unsupported CSS value");
  }

  return {
    selector: fix.selector,
    property: fix.property,
    value,
  };
}

function makeFixes(design, page) {
  return design.designIssues.flatMap((issue, index) => {
    const property = properties[issue.property];

    const match = design.matching.find(
      (item) => item.designId === issue.element
    );

    const element = page.elements.find(
      (item) => item.id === match?.webpageId
    );

    if (!property || !element?.selector) {
      return [];
    }

    const value =
      typeof issue.expected === "number" &&
      issue.property !== "fontWeight"
        ? `${issue.expected}px`
        : String(issue.expected);

    try {
      return [
        {
          id: `fix-${index}`,
          ...validateFix({
            selector: element.selector,
            property,
            value,
          }),
          originalValue: issue.actual,
          text: element.text,
          kind: "design",
          note:
            "Matches the supplied design; accessibility improvement is not guaranteed.",
        },
      ];
    } catch {
      return [];
    }
  });
}

/**
 * Converts Ajit's comparison css_fixes object directly into the
 * format consumed by Rithvik's /api/github/plan route.
 */
function commitFixesFromCss(selector, cssFixes) {
  if (
    typeof selector !== "string" ||
    !selector ||
    !cssFixes ||
    typeof cssFixes !== "object" ||
    Array.isArray(cssFixes)
  ) {
    return [];
  }

  return Object.entries(cssFixes).map(
    ([property, value], index) => ({
      id: `comparison-fix-${index}`,
      ...validateFix({
        selector,
        property,
        value,
      }),
      kind: "design",
      note:
        "Generated from the verified Parity Figma comparison.",
    })
  );
}

function cssFor(fixes) {
  if (
    !Array.isArray(fixes) ||
    !fixes.length ||
    fixes.length > 100
  ) {
    throw new Error("Select 1–100 fixes");
  }

  return (
    "/* Parity overrides — reviewed styling changes */\n" +
    fixes
      .map(validateFix)
      .map(
        (fix) =>
          `${fix.selector} { ${fix.property}: ${fix.value} !important; }`
      )
      .join("\n") +
    "\n"
  );
}

module.exports = {
  makeFixes,
  validateFix,
  cssFor,
  commitFixesFromCss,
};
