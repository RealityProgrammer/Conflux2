import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'
import { csrfService } from "./api/csrfService.ts";

async function initializeApp() {
    await csrfService.requestCsrfToken();

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <RouterProvider router={router}/>
        </StrictMode>,
    )
}

initializeApp();