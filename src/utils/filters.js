import { encodeAddress } from "@polkadot/util-crypto";

export function encodeAddressByType(address, addressType) {
  if (!address) {
    return "";
  }
  return encodeAddress(address, addressType);
}
