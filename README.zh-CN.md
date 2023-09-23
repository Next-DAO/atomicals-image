# atomicals-js image

本项目包含了 atomicals-js 官方仓库 [atomicals-js](https://github.com/atomicals/atomicals-js).

目的是为了让不想安装 nodejs 和 npm 的用户能够简单的使用 atomicals 的 cli.

**NOTE:** 只在 macOS/Linux 上测试过. Windows 用户请自行尝试.

## 使用方法

### 1. 首先安装 [Docker](https://docs.docker.com/engine/install/#supported-platforms) 。如果你使用 macOS 建议安装 [Orbstack](https://orbstack.dev/)。

### 2a. 执行下面的命令来构建镜像:

如果你不想自己构建，跳到步骤 `2b`。

```bash
git clone https://github.com/lucky2077/atomicals-image
```

```bash
cd atomicals-image
```

```bash
docker build -t atomicals .
```

### 2b. 直接从 docker hub 拉取镜像:

如果你使用的是 Apple Silicon Mac，请回到步骤 `2a` 自己构建。(Github Actions 构建 linux/arm64 镜像失败，暂时无法解决。)

```bash
docker pull lucky2077/atomicals
```

```bash
docker tag lucky2077/atomicals atomicals
```

### 3. 执行下面的命令来查看余额; 如果成功你会看到两个地址和两个二维码图片。

先创建一个空的 `local-wallet.json` 文件。

```bash
touch local-wallet.json
```

```bash
docker run -it --rm -v `pwd`/local-wallet.json:/wallet.json atomicals yarn cli balances
```

- 如果 `local-wallet.json` 文件为空，容器会自动执行 `yarn cli wallet-init` 并将钱包信息存进去。
- `:/wallet.json` 是镜像内部使用的，**不要修改**。
- 将 `yarn cli balances` 替换成官方文档中的其他命令。 https://docs.atomicals.xyz/

**NOTE:** 防止被误删，外加需要备份，你应该将 `local-wallet.json` 文件保存到一个 **安全** 的地方。

### 4. (可选) 你可以使用 alias 来简化命令:

_看不懂的可以忽略这一步。真的不重要。_

复制下面内容到你的 .bashrc 或 .zshrc

```bash
alias atom-cli='f() { if [ -f "$1" ]; then docker run -it --rm -v "$1":/wallet.json atomicals yarn cli "${@:2}"; else echo "wallet file $1 not exit"; fi; unset -f f; }; f'
```

然后就可以像这样执行

```bash
atom-cli `pwd`/local-wallet.json balances
```

### 5. (可选) 你可以使用下面的命令来创建多个钱包:

```bash
# 创建 wallets 文件夹
mkdir wallets

# 在 wallets 文件夹中创建 10 个空的 wallet.json 文件
# 最终呈现为： wallets/wallet1.json, wallets/wallet2.json, ..., wallets/wallet10.json
# 打开 10 个终端或者使用 tmux/screen，下面一条命令在一个终端执行
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
