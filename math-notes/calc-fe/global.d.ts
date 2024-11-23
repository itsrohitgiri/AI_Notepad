declare global {
    interface Window {
        MathJax: {
            Hub: {
                Queue: (args: unknown[]) => void;
                Config: (config: unknown) => void;
            };
        };
    }
}
export {};