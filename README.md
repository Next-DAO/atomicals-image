# atomicals-js image

This repository contains all source codes for the official repository [atomicals-js](https://github.com/atomicals/atomicals-js).

Aim to provide a simple and easy way to use atomicals's cli. For whom struggled with the installation of nodejs and npm.

## Usage

1. Install [Docker](https://docs.docker.com/engine/install/#supported-platforms) first. (Recommend to use [Orbstack](https://orbstack.dev/) if you are using macOS.)

2. Run the following command to build the image:

```bash
docker build --build-arg WALLET=lucky2077 -t atom-lucky2077 .
```

3. SAVE the json parts to a `SAFE` place.

4. Run the following command to check your balance; You'll see two addresses and two qr-code images if succeed.

```bash
docker run -it --rm atom-lucky2077 balances
```

5. If you want to create many wallets, change all the `lucky2077` to your other names.

## For Advanced Users OR Who has `wallet.json`

1. Run the following command to build the image:

```bash
docker build -f Dockerfile.advanced -t atom-advanced .
```

2. Create an empty `wallet.json` file OR SKIP this step if you already have one.

```bash
touch wallet.json
```

3. Run the following command to check your balance:

```bash
docker run -it --rm -v ${path-to-your-wallet.json}:/wallet.json atom-advanced yarn cli balances
```

**NOTE:** If your created `wallet.json` in step 2, you should save it to a `SAFE` place.

4. (Optional) You can use alias to make it easier to use:

```bash
# add this to your .bashrc or .zshrc
alias atom-cli='f() { docker run -it --rm -v "$1":/wallet.json atom-advanced yarn cli "${@:2}"; unset -f f; }; f'

# then you can use it like this
atom-cli ${path-to-your-wallet.json} balances
```
