# atomicals-js image

This repository contains all source codes for the official repository [atomicals-js](https://github.com/atomicals/atomicals-js).

Aim to provide a simple and easy way to use atomicals's cli. For whom struggled with the installation of nodejs and npm.

**NOTE:** Only tested on macOS/Linux.

## Usage

### 1. Install [Docker](https://docs.docker.com/engine/install/#supported-platforms) first. (Recommend to use [Orbstack](https://orbstack.dev/) if you are using macOS.)

### 2a. Run the following command to build the image:

Jump to step `2b` if you don't want to build it yourself.

```bash
git clone https://github.com/lucky2077/atomicals-image
```

```bash
cd atomicals-image
```

```bash
docker build -t atomicals .
```

### 2b. Or you can pull the image from docker hub:

```bash
docker pull lucky2077/atomicals
```

```bash
docker tag lucky2077/atomicals atomicals
```

### 3. Run the following command to check your balance; You'll see two addresses and two qr-code images if succeed.

crete an empty file named `local-wallet.json` first.

```bash
touch local-wallet.json
```

```bash
docker run -it --rm -v `pwd`/local-wallet.json:/wallet.json atomicals yarn cli balances
```

- The container will execute `yarn cli wallet-init` automatically if the `local-wallet.json` is empty. And save wallet info into `local-wallet.json`.
- The `:/wallet.json` is used by the image, **DO NOT CHANGE IT**.
- replace `yarn cli balances` with other commands from official docs. https://docs.atomicals.xyz/

**NOTE:** You should save the `local-wallet.json` to a `SAFE` place.

### 4. (Optional) You can use alias to make it easier to use:

add this to your .bashrc or .zshrc

```bash
alias atom-cli='f() { if [ -f "$1" ]; then docker run -it --rm -v "$1":/wallet.json atomicals yarn cli "${@:2}"; else echo "wallet file $1 not exit"; fi; unset -f f; }; f'
```

then you can use it like this

```bash
atom-cli `pwd`/local-wallet.json balances
```

### 5. (Optional) You can use the following command to create many wallets:

```bash
mkdir wallets

# create 10 empty wallet.json file in wallets folder
# e.g. wallets/wallet1.json, wallets/wallet2.json, ...
touch wallets/wallet{1..10}.json

# open 10 terminals or use tmux/screen
# run the following command in each terminal
docker run -it --rm -v `pwd`/wallets/wallet1.json:/wallet.json atomicals yarn cli mint-dft pepe
docker run -it --rm -v `pwd`/wallets/wallet2.json:/wallet.json atomicals yarn cli mint-dft pepe
...
docker run -it --rm -v `pwd`/wallets/wallet10.json:/wallet.json atomicals yarn cli mint-dft pepe

# or use alias
atom-cli `pwd`/wallets/wallet1.json mint-dft pepe
atom-cli `pwd`/wallets/wallet2.json mint-dft pepe
...
atom-cli `pwd`/wallets/wallet10.json mint-dft pepe

```
