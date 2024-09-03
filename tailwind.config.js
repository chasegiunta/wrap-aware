/** @type {import('tailwindcss').Config} */
export default {
  content: ["index.html", "./docs/**/*.{js,ts,vue}"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
};
