export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        muted: "#5b6371",
        panel: "#f7f8fa",
        line: "#e4e8ef",
        profit: "#11845b",
        "profit-soft": "rgba(17, 132, 91, 0.08)",
        "profit-edge": "rgba(17, 132, 91, 0.65)",
        loss: "#b42318",
        "loss-soft": "rgba(180, 35, 24, 0.07)",
        "loss-edge": "rgba(180, 35, 24, 0.65)",
        signal: "#2454d6",
        "signal-soft": "rgba(36, 84, 214, 0.08)"
      }
    }
  },
  plugins: []
};
