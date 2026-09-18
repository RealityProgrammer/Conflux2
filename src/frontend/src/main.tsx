import {StrictMode} from "react"
import {createRoot} from "react-dom/client"
import './index.css'
import {RouterProvider} from "react-router"
import {router} from "./router.tsx"
import {csrfService} from "./api/csrfService.ts";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

export const queryClient = new QueryClient();

async function initializeApp() {
  await csrfService.requestCsrfToken();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router}/>
      </QueryClientProvider>
    </StrictMode>,
  )
}

initializeApp();