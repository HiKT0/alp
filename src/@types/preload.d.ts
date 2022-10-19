import { API } from "../preload"

declare global {
    interface Window { ALPEngine: typeof API }
}