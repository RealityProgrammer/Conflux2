import { defineConfig } from "vite"
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5127',
        changeOrigin: true,
      },
      '/graphql': {
        target: 'http://localhost:5127/graphql',
        changeOrigin: true,
      },
      '/hub': {
        target: 'http://localhost:5127',
        ws: true,
        changeOrigin: true,
      },
    }
  }
})
