import { getStationInfo } from "../commands";

/** @type {() => Promise<{[key: string]: string}[]>} */
export async function getStationList() {
  const stationInfo = await getStationInfo();

  return stationInfo;
}
