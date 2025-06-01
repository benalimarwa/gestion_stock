import html2canvasOriginal from "html2canvas";

export const html2canvas = (element: HTMLElement, options?: any) => {
  // Patch CSS parsing to handle oklch
  const styleSheets = document.styleSheets;
  for (let sheet of styleSheets) {
    try {
      for (let rule of sheet.cssRules as any) {
        if (rule.style && rule.style.background) {
          // Replace oklch with a fallback (e.g., rgb)
          rule.style.background = rule.style.background.replace(
            /oklch\([^)]+\)/g,
            "rgb(200, 200, 200)" // Fallback color, adjust as needed
          );
        }
      }
    } catch (e) {
      console.warn("Cannot access stylesheet:", e);
    }
  }
  return html2canvasOriginal(element, options);
};