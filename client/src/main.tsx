import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make dark mode the default. Respect an explicit user preference stored in localStorage,
// otherwise default to 'dark' and add the Tailwind 'dark' class to <html> immediately.
try {
    const stored = localStorage.getItem('theme');
    if (!stored) {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
    } else {
        if (stored === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }
} catch (e) {
    // ignore (e.g., non-browser env)
}

createRoot(document.getElementById("root")!).render(<App />);
