# VIP: VIm Plugin manager

    ██╗░░░██╗██╗██████╗░
    ██║░░░██║██║██╔══██╗
    ╚██╗░██╔╝██║██████╔╝
    ░╚████╔╝░██║██╔═══╝░
    ░░╚██╔╝░░██║██║░░░░░
    ░░░╚═╝░░░╚═╝╚═╝░░░░░

This software is still ALPHA quality. The APIs will be likely to change.

## Installation

Please the prebuilt binary download
from [releases](https://github.com/tani/vip/releases/tag/nightly).

**This binary does no require the installtion of Deno.**

For the developers, you can install the nightly version using Deno.

Install:
```
deno install --allow-env --allow-net --allow-read --allow-write --allow-run --name vip https://raw.githubusercontent.com/tani/vip/master/vip.ts
```

Update:
```
deno cache --reload  https://raw.githubusercontent.com/tani/vip/master/vip.ts
```

## Quickstart

Add the package path in `~/.vimrc` or `~/.config/nvim/init.vim`.

```vim
exe 'set packpath^=' .. expand('~/.vip') | packloadall
```

Run `add` subcommand to install a package.

```
vip add michaelb/do-nothing.vim
```

Now, we are ready to use Vim.

## Usage

### Add new package

```
vip add michaelb/do-nothing.vim ...
```

`--opt` option sets the type of the plugin `opt`

```
vip add --opt michaelb/do-nothing.vim
```

### Remove package

```
vip remove do-nothing.vim ...
```

`--opt` option sets the type of the plugin `opt`

```
vip remove --opt do-nothing.vim
```

### Show packages

```
vip list
```

`--opt` option sets the type of the plugin `opt`

```
vip list --opt
```

### Update and synchronize packages

```
vip sync
```

## Copyright and License

Copyright (c) 2022 TANIGUCHI Masaya. All rights reserved.

This software is licensed under the MIT License https://git.io/mit-license

