import type { Config } from "tailwindcss";

const config: Omit<Config, "content"> = {
  darkMode: "class",
  theme: {
    extend: {},
  },
};

export default config;
