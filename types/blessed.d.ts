export type Screen = {
  render: () => void;
  key: (keys: string[], callback: (ch: string, key: string) => void) => void;
  append: (BlessedElement) => void;
};

export type BlessedElement = {
  destroy: () => void;
  type: string;
  key: (keys: string[], callback: (ch: string, key: string) => void) => void;
  focus: () => void;
  on(event: "focus", callback: () => void): void;
  on(event: "blur", callback: () => void): void;
};

export type Reblessed = {
  screen: (options?: any) => Screen;
};
