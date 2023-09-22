const bitcoin = require('bitcoinjs-lib');
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { createMnemonicPhrase } from './create-mnemonic-phrase';
bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);
import BIP32Factory from 'bip32';
const bip32 = BIP32Factory(ecc);

export const toXOnly = (publicKey) => {
    return publicKey.slice(1, 33);
}
const bip39 = require('bip39');

export const createKeyPair = async (phrase: string = '', path = `m/44'/0'/0'/0/0`) => {
    if (!phrase || phrase === '') {
        const phraseResult = await createMnemonicPhrase();
        phrase = phraseResult.phrase;
    }
    const seed = await bip39.mnemonicToSeed(phrase);
    const rootKey = bip32.fromSeed(seed);
    const childNodePrimary = rootKey.derivePath(path);
    // const p2pkh = bitcoin.payments.p2pkh({ pubkey: childNodePrimary.publicKey });
    const childNodeXOnlyPubkeyPrimary = toXOnly(childNodePrimary.publicKey);
    const p2trPrimary = bitcoin.payments.p2tr({
        internalPubkey: childNodeXOnlyPubkeyPrimary
    });
    if (!p2trPrimary.address || !p2trPrimary.output) {
        throw "error creating p2tr"
    }
    // Used for signing, since the output and address are using a tweaked key
    // We must tweak the signer in the same way.
    const tweakedChildNodePrimary = childNodePrimary.tweak(
        bitcoin.crypto.taggedHash('TapTweak', childNodeXOnlyPubkeyPrimary),
    );

    // Do a sanity check with the WIF serialized and then verify childNodePrimary is the same
    const wif = childNodePrimary.toWIF();
    const keypair = ECPair.fromWIF(wif);

    if (childNodePrimary.publicKey.toString('hex') !== keypair.publicKey.toString('hex')) {
        throw 'createKeyPair error child node not match sanity check'
    }
    return {
        address: p2trPrimary.address,
        publicKey: childNodePrimary.publicKey.toString('hex'),
        publicKeyXOnly: childNodeXOnlyPubkeyPrimary.toString('hex'),
        path,
        WIF: childNodePrimary.toWIF(),
        privateKey: childNodePrimary.privateKey?.toString('hex'),
        // tweakedChildNode: tweakedChildNodePrimary
    }
}

export const createPrimaryAndFundingKeyPairs = async () => {
    const phraseResult = await createMnemonicPhrase();
    //const seed = await bip39.mnemonicToSeed(phraseResult.phrase);

    return {
        phrase: phraseResult.phrase,
        primary: await createKeyPair(phraseResult.phrase, `m/44'/0'/0'/0/0`),
        funding: await createKeyPair(phraseResult.phrase, `m/44'/0'/0'/1/0`)
    }
}

export const createNKeyPairs = async (phrase, n = 1) => {
    const keypairs: any = [];
    for (let i = 0; i < n; i++) {
        keypairs.push(await createKeyPair(phrase, `m/44'/0'/0'/0/${i}`));
    }
    return {
        phrase,
        keypairs,
    }
}