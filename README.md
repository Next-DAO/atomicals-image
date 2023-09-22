# atomicals-js image

This repository contains all source codes for the official repository [atomicals-js](https://github.com/atomicals/atomicals-js).

Aim to provide a simple and easy way to use atomicals's cli. For whom struggled with the installation of nodejs and npm.

**NOTE:** Only tested on macOS/Linux.

## Usage

1. Install [Docker](https://docs.docker.com/engine/install/#supported-platforms) first. (Recommend to use [Orbstack](https://orbstack.dev/) if you are using macOS.)

2. Run the following command to build the image:

```bash
docker build -t atomicals .

# or you can use image build by me.
docker pull lucky2077/atomicals:latest
docker tag lucky2077/atomicals:latest atomicals
```

3. Run the following command to check your balance; You'll see two addresses and two qr-code images if succeed.

```bash
touch wallet.json

docker run -it --rm -v `pwd`/wallet.json:/wallet.json atomicals yarn cli balances
```

**NOTE:** You should save the `wallet.json` to a `SAFE` place.

4. (Optional) You can use alias to make it easier to use:

```bash
# add this to your .bashrc or .zshrc
alias atom-cli='f() { docker run -it --rm -v "$1":/wallet.json atomicals yarn cli "${@:2}"; unset -f f; }; f'

# then you can use it like this
atom-cli `pwd`/wallet.json balances
```

5. (Optional) You can use the following command to create many wallets:

```bash
mkdir wallets

touch wallets/wallet{1..10}.json

atom-cli `pwd`/wallets/wallet1.json mint-dft pepe
atom-cli `pwd`/wallets/wallet2.json mint-dft pepe
...
atom-cli `pwd`/wallets/wallet10.json mint-dft pepe

```
