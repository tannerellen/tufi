export type StringKeyedObject = {
  [key: string]: string | number | boolean;
};

// export type FieldMap = Map<string, Label>;
export type FieldMap = Map<
  string,
  { name: string; type: "string" | "number" | "boolean" }
>;

export type DeviceLink = {
  ssid: string;
  frequency: number;
  rate: number;
  channelWidth: string;
  band: string;
  channel: number;
};

export type Network = {
  ssid: string;
  security: string;
  signal: number;
  connected?: boolean;
};

export type KnownNetwork = {
  name: string;
  uuid: string;
  ssid: string;
  timestamp: number;
};

export type NetworkDisplay = {
  ssid: string;
  security: string;
  signal: string;
  connected?: string;
};

export type NetworkLists = {
  allNetworks: NetworkDisplay[];
  knownNetworks: NetworkDisplay[];
};

export type WifiCredentials = {
  ssid: string;
  keyMgmt: string;
  password: string;
  hidden: boolean;
};

export type Connectivity = "unknown" | "none" | "portal" | "limited" | "full";

export type EnterpriseOptions = {
  ssid: string;
  eap: "peap" | "ttls";
  phase2Auth: "mschapv2" | "gtc" | "pap";
  identity: string;
  password: string;
  anonymousIdentity?: string;
  domain?: string;
};

export type ListTableDataItem = {
  [key: string]: string;
};

export type ListTableData = ListTableDataItem[];
