export type StringKeyedObject = {
  [key: string]: string | number | boolean;
};

export type FieldMap = Map<string, Label>;

export type Network = {
  ssid: string;
  security: string;
  signal: number;
  connected?: boolean;
};

export type NetworkLists = {
  allNetworks: Network[];
  knownNetworks: Network[];
};

export type ListTableDataItem = {
  [key: string]: string;
};

export type ListTableData = ListTableDataItem[];
