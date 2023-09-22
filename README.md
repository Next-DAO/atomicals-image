# Atomicals Javascript Library

> atomicals.xyz

![Atomicals](banner.png)

### Install, Build and Run Tests

## Install

With npm:
```
npm install atomicals

...or download the github repo and then run:

npm install (from inside the directory)

...then build:

npm build

And that's it!

See all commands at:

npm cli --help

```

### Quick Start - Command Line (CLI)

First install packages and build, then follow the steps here to create your first Atomical and query the status. Use `yarn cli`to get a list of all commands available.

#### 0. Environment File (.env)

The environment file comes with defaults (`.env.example`), but it is highly recommend to install and operate your own ElectrumX server. Web browser communication is possible through the `wss` (secure websockets) interface of ElectrumX.

```
ELECTRUMX_WSS=wss://electrumx.atomicals.xyz:50012
```

_ELECTRUMX_WSS_: URL of the ElectrumX with Atomicals support. Note that only `wss` endpoints are accessible from web browsers.

#### 1. Wallet Setup

The purpose of the wallet is to create p2tr (pay-to-taproot) spend scripts and to receive change from the transactions made for the various operations. _Do not put more funds than you can afford to lose, as this is still beta!_ 


To initialize a new `wallet.json` file that will store your address for receiving change use the `wallet-init` command. Alternatively, you may populate the `wallet.json` manually, ensuring that the address at `m/44'/0'/0'/0/0` is equal to the address and the derivePath is set correctly.

```
yarn cli wallet-init

>>>

Wallet created at wallet.json
phrase: maple maple maple maple maple maple maple maple maple maple maple maple
Legacy address (for change): 1FXL2CJ9nAC...u3e9Evdsa2pKrPhkag
Derive Path: m/44'/0'/0'/0/0
WIF: L5Sa65gNR6QsBjqK.....r6o4YzcqNRnJ1p4a6GPxqQQ
------------------------------------------------------
```

#### 2. Explore the CLI

```
yarn cli --help
```
 
#### 3. Quick Commands

Make sure to initialize local wallet as in step 1. above first

*Register a Realm*

```
npm cli mint-realm <realm> --bitworkc=<Any 4 digit number/hex >

Example:

npm cli mint-realm helloworld --bitworkc=0123

```

*Register a Container*

```
npm cli mint-container <container> --bitworkc=<Any 4 digit number/hex >

Example:

npm cli mint-realm "cool-nft-collection" --bitworkc=7872

```

*Mint NFT*

```
npm cli mint-nft image.jpg  


```


*Mint FT Token (Decentralized) *

```
npm cli init-dft <ticker> <units per mint> <max mints allowed> <mint height> image.jpg --bitworkc=<Any 4 digit number/hex >

Examples:

npm cli init-dft coolticker 1000 2100 0 image.jpg --bitworkc=0002

npm cli init-dft onyx 1000 3000 808000 image.jpg --meta @sample-ft-meta.json

// After the token ticker was claimed, then mint with:

npm cli mint-dft <ticker name>


```

*Mint FT Token (Direct) *

```
npm cli mint-ft <ticker> <total supply> <images/files...> --bitworkc=<Any 4 digit number/hex >

Examples:

npm cli mint-ft act 1000000 image.jpg --bitworkc=1234 


```


## ElectrumX Server RPC Interface

See updated ElectrumX (https://github.com/atomicals/electrumx-atomicals) 

## Any questions or ideas?

https://atomicals.xyz

https://x.com/atomicalsxyz (X - Formerly Twitter)

  