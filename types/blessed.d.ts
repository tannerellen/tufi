export type Screen = BlessedElement;

export type BlessedElement = {
  name: string;
  type: string;
  selected: number;
  children: BlessedElement[];
  rows: string[][];
  render: () => void;
  destroy: () => void;
  focus: () => void;
  focusNext: () => void;
  submit: () => void;
  show: () => void;
  hide: () => void;
  setContent: (content: string) => void;
  setData: (listData: string[][]) => void;
  select: (index: number) => void;
  append: (container: BlessedElement) => void;
  emit: (type: string, listElement: BlessedElement, index: number) => void;
  on(event: "click", callback: () => void): void;
  on(event: "press", callback: () => void): void;
  on(event: "focus", callback: () => void): void;
  on(
    event: "select",
    callback: (item: BlessedElement, index: number) => void,
  ): void;
  on(event: "submit", callback: () => void): void;
  on(event: "cancel", callback: () => void): void;
  on(event: "blur", callback: () => void): void;
  on(event: "destroy", callback: () => void): void;
  key: (keys: string[], callback: (ch: string, key: string) => void) => void;
  items: BlessedElement[];
  content?: string;
  top: number | string;
  right: number | string;
  bottom: number | string;
  left: number | string;
  height: number | string;
  width: number | string;
  style: any;
};

export type Reblessed = {
  screen: (options?: any) => Screen;
  box: (options?: any) => BlessedElement;
  form: (options?: any) => BlessedElement;
  listtable: (options?: any) => BlessedElement;
  textbox: (options?: any) => BlessedElement;
  text: (options?: any) => BlessedElement;
  button: (options?: any) => BlessedElement;
  parseTags: (content: string) => string;
};
