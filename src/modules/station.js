import { getStationInfo } from "../commands";

export async function getStationList() {
  const stationInfo = await getStationInfo();

  return stationInfo;
}
