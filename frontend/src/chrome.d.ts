declare const chrome:
  | {
      storage?: {
        local: {
          get(key: string): Promise<Record<string, unknown>>;
          set(items: Record<string, unknown>): Promise<void>;
        };
      };
      devtools?: {
        inspectedWindow: {
          eval(
            expression: string,
            callback: (result: unknown, exceptionInfo?: { isError?: boolean; isException?: boolean }) => void
          ): void;
        };
        panels: {
          elements: {
            onSelectionChanged: {
              addListener(callback: () => void): void;
              removeListener(callback: () => void): void;
            };
          };
        };
      };
    }
  | undefined;