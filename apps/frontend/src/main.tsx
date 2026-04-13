import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";

// App entry point
createRoot(document.getElementById("root")!).render(<App />);
