import * as css from "css-tree";

function hexMonochrome(value: string, dark = false) {
  const expanded =
    value.length === 3 || value.length === 4
      ? [...value].map((c) => c + c).join("")
      : value;
  const r = parseInt(expanded.slice(0, 2), 16),
    g = parseInt(expanded.slice(2, 4), 16),
    b = parseInt(expanded.slice(4, 6), 16);
  if (r === g && g === b) return value;
  // Keep paper/tints pale, turn chromatic ink into neutral black. Alpha is preserved.
  const tone = dark ? "eeeeee" : Math.min(r, g, b) > 210 ? "eeeeee" : "111111";
  return tone + (expanded.length === 8 ? expanded.slice(6) : "");
}
function neutralValue(value: string, dark = false) {
  const ast = css.parse(value, { context: "value" });
  css.walk(ast, {
    enter(
      this: css.WalkContext,
      node: css.CssNode,
      item: css.ListItem<css.CssNode>,
      list: css.List<css.CssNode>,
    ) {
      if (node.type === "Url") return this.skip;
      if (node.type === "Hash") node.value = hexMonochrome(node.value, dark);
      if (
        node.type === "Identifier" &&
        !/^(transparent|currentcolor|black|white|gr[ae]y|darkgr[ae]y|lightgr[ae]y|dimgr[ae]y|silver|gainsboro|whitesmoke)$/i.test(
          node.name,
        ) &&
        css.lexer.matchType("color", node.name).matched
      ) {
        node.name = dark ? "#eeeeee" : "#111111";
      }
      if (
        node.type === "Function" &&
        /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)$/i.test(
          node.name,
        ) &&
        item &&
        list
      ) {
        const channels = css
          .generate(node)
          .match(/^rgba?\(([^)]+)\)$/i)?.[1]
          .match(/[\d.]+%?/g);
        if (
          channels &&
          channels.length >= 3 &&
          channels[0] === channels[1] &&
          channels[1] === channels[2]
        )
          return this.skip;
        const alpha =
          channels?.[3] || css.generate(node).match(/\/\s*([\d.]+%?)/)?.[1];
        const ink = dark ? "238,238,238" : "17,17,17";
        const paint = alpha
          ? `rgba(${ink},${alpha})`
          : dark
            ? "#eeeeee"
            : "#111111";
        const replacement = css.parse(paint, { context: "value" }) as css.Value;
        list.replace(item, list.createItem(replacement.children.first!));
        return this.skip;
      }
    },
  });
  return css.generate(ast);
}
export function applyMonochrome(html: string, dark = false) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of ["fill", "stroke", "color", "stop-color", "flood-color"])
      if (el.hasAttribute(attr))
        el.setAttribute(attr, neutralValue(el.getAttribute(attr)!, dark));
    if (el.hasAttribute("style"))
      el.setAttribute("style", style(el.getAttribute("style")!, true));
  });
  function style(value: string, inline = false) {
    try {
      const ast = css.parse(value, {
        context: inline ? "declarationList" : "stylesheet",
      });
      css.walk(ast, {
        visit: "Declaration",
        enter(node) {
          if (/color|fill|stroke|background|border|^--/.test(node.property))
            node.value = css.parse(
              neutralValue(css.generate(node.value), dark),
              { context: "value" },
            ) as css.Value;
        },
      });
      return css.generate(ast);
    } catch {
      return value;
    }
  }
  doc
    .querySelectorAll("style")
    .forEach((el) => (el.textContent = style(el.textContent || "")));
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
