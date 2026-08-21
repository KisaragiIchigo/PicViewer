/** @type {import('tailwindcss').Config} */
// パレット・フォントの単一情報源は project_style.json。ここはその写像であり、
// 新しい色やフォントを追加する場合は先に project_style.json を更新すること。
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#05070b",
        canvas: "#000000",
      },
      fontFamily: {
        display: ["Bahnschrift", "BIZ UDPGothic", "Yu Gothic UI", "sans-serif"],
        sans: ["Bahnschrift", "BIZ UDPGothic", "Yu Gothic UI", "sans-serif"],
        jp: ["BIZ UDPGothic", "Yu Gothic UI", "Meiryo", "sans-serif"],
        mono: ["Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
      },
      fontSize: {
        label: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.14em" }],
      },
      boxShadow: {
        chrome: "0 8px 32px rgba(0,0,0,0.6)",
        inset: "inset 0 1px 3px rgba(0,0,0,0.5)",
        glow: "0 0 15px rgba(20,184,166,0.2)",
        "glow-strong": "0 0 22px rgba(20,184,166,0.32)",
      },
      transitionTimingFunction: {
        chrome: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      zIndex: {
        chrome: "30",
        floating: "40",
        modal: "50",
        tooltip: "60",
      },
    },
  },
  plugins: [],
};
