export type Screen = {
  render: () => void;
  key: OnKey;
  append: (BlessedElement) => void;
};

export type BlessedElement = {
  name: string;
  type: string;
  selected: number;
  children: BlessedElement[];
  destroy: () => void;
  focus: () => void;
  setData: (listData: string[][]) => void;
  select: (index: number) => void;
  append: (container: BlessedElement) => void;
  emit: (type: string, listElement: BlessedElement, index: number) => void;
  on(event: "click", callback: () => void): void;
  on(event: "focus", callback: () => void): void;
  on(
    event: "select",
    callback: (item: BlessedElement, index: number) => void,
  ): void;
  on(event: "blur", callback: () => void): void;
  on(event: "destroy", callback: () => void): void;
  key: (keys: string[], callback: (ch: string, key: string) => void) => void;
  items: BlessedElement[];
  content?: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
  height: number;
  width: number;
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
};
