import * as bs58check from "bs58check";
import { sha256 } from "js-sha256";
import * as ecc from 'tiny-secp256k1';
import { IValidatedWalletInfo, IWalletRecord } from "./validate-wallet-storage";
import { AtomicalStatus, LocationInfo } from "../interfaces/atomical-status.interface";
import { IInputUtxoPartial } from "../types/UTXO.interface";
const bitcoin = require('bitcoinjs-lib');
bitcoin.initEccLib(ecc);

export function detectAddressTypeToScripthash(address: string): { output: string, scripthash: string, address: string } {
  // Detect legacy address
  try {
    bitcoin.address.fromBase58Check(address);
    const p2pkh = addressToP2PKH(address);
    const p2pkhBuf = Buffer.from(p2pkh, "hex");
    return {
      output: p2pkh,
      scripthash: Buffer.from(sha256(p2pkhBuf), "hex").reverse().toString("hex"),
      address
    }
  } catch (err) {
  }

  // Detect segwit or taproot
  const detected = bitcoin.address.fromBech32(address);
  if (address.indexOf('bc1p') === 0) {
    const output = bitcoin.address.toOutputScript(address);
    return {
      output,
      scripthash: Buffer.from(sha256(output), "hex").reverse().toString("hex"),
      address
    }
  } else if (address.indexOf('bc1') === 0) {
    const output = bitcoin.address.toOutputScript(address);
    return {
      output,
      scripthash: Buffer.from(sha256(output), "hex").reverse().toString("hex"),
      address
    }
  } else {
    throw "unrecognized address";
  }
}

export function detectScriptToAddressType(script: string): string {
  const address = bitcoin.address.fromOutputScript(Buffer.from(script, 'hex'))
  return address;
}


export function addressToScripthash(address: string): string {
  const p2pkh = addressToP2PKH(address);
  const p2pkhBuf = Buffer.from(p2pkh, "hex");
  return Buffer.from(sha256(p2pkhBuf), "hex").reverse().toString("hex");
}

export function addressToP2PKH(address: string): string {
  const addressDecoded = bs58check.decode(address);
  const addressDecodedSub = addressDecoded.toString().substr(2);
  const p2pkh = `76a914${addressDecodedSub}88ac`;
  return p2pkh;
}

export function addressToHash160(address: string): string {
  const addressDecoded = bs58check.decode(address);
  const addressDecodedSub = addressDecoded.toString().substr(2);
  return addressDecodedSub;
}
export function hash160BufToAddress(hash160: Buffer): string {
  const addressEncoded = bs58check.encode(hash160);
  return addressEncoded;
}
export function hash160HexToAddress(hash160: string): string {
  const addressEncoded = bs58check.encode(Buffer.from(hash160, "hex"));
  return addressEncoded;
}

export function performAddressAliasReplacement(walletInfo: IValidatedWalletInfo, address: string) {
  let addressToReturn;
  if (address === 'primary') {
    addressToReturn = walletInfo.primary.address;
  }
  else if (address === 'funding') {
    addressToReturn = walletInfo.funding.address;
  }
  else if (walletInfo.imported && walletInfo.imported[address]) {
    addressToReturn = walletInfo.imported[address].address;
  } else {
    addressToReturn = address
  }
  if (!addressToReturn) {
    return addressToReturn;
  }
  return detectAddressTypeToScripthash(addressToReturn)
}

/**
 * Whether the atomical for the mint is owned by the provided wallet or not
 * @param ownerRecord The proposed wallet that owns the atomical
 * @param atomical 
 * @returns 
 */
export function IsAtomicalOwnedByWalletRecord(address: string, atomical: AtomicalStatus): IInputUtxoPartial | null {
  if (!(atomical.location_info as any).length) {
    throw new Error('Error: location_info not found');
  }
  const locationInfo: any = atomical.location_info;
  const currentLocation = locationInfo[0] || {};
  return GetUtxoPartialFromLocation(address, currentLocation, false);
}

export function GetUtxoPartialFromLocation(addressToCheck: string, locationInfo: LocationInfo, throwOnMismatch = true): IInputUtxoPartial | null {
  if (!locationInfo) {
    throw new Error('Error: location_info not found');
  }
  // Just in case populate the address on locationInfo if it was not set
  // It can be deduced from the script field
  let detectedAddress;
  try {
    detectedAddress = detectScriptToAddressType(locationInfo.script)
  } catch (err) {
    throw new Error('Error: invalid script address');
  }
  locationInfo.address = detectedAddress;
  if (addressToCheck !== locationInfo.address as any) {
    if (throwOnMismatch) {
      throw new Error('location_info not match expected address. expectedAddress=' + addressToCheck + ', foundAddress=' + locationInfo.address);
    }
    return null;
  }
  return {
    hash: locationInfo.txid,
    index: Number(locationInfo.index),
    address: detectedAddress,
    witnessUtxo: {
      value: Number(locationInfo.value),
      script: Buffer.from(locationInfo.script, 'hex')
    }
  };
}
