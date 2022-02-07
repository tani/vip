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

## Create Sandbox

1. Move a working directory  `mkdir /tmp/work && cd /tmp/work`
2. Create `.vip` directory `mkdir .vip`
3. Add your favorite plugin `vip add michaelb/do-nothing.vim`
4. Run `vip vim ...` / `vip nvim ...`

The last command is equaivalent to `vim -N -u NONE --cmd='set packpath^=/path/to/.vip | packloadall' ...`.

## Usage

Every installation and deletion are synchronized with
`~/.vip/settings.json` as follows.

```json
{
  "version": "0",
  "packages": [{
    "name": "michaelb/do-nothing.vim",
    "protocol": "https",
    "type": "start",
    "branch": "master",
    "dependencies": []
  }]
}
```

### Add new package

```
vip add michaelb/do-nothing.vim [extra dependencies ...]
```

`--protocl / -p` option sets the protocol to clone the repository.

```
vip add --protocol ssh michaelb/do-nothing.vim
vip add -p ssh michaelb/do-nothing.vim
```

`--type / -t` option sets the type of the plugin whether `opt` or `start`.

```
vip add --type opt michaelb/do-nothing.vim
vip add -t opt michaelb/do-nothing.vim
```

`--branch / -b` option sets the branch of repository.

```
vip add --branch master michaelb/do-nothing.vim
vip add -b master michaelb/do-nothing.vim
```

### Remove package

```
vip remove do-nothing.vim
```

### Update and synchronize packages

```
vip sync
```

## Copyright and License

Copyright (c) 2022 TANIGUCHI Masaya. All rights reserved.

This software is licensed under the MIT License https://git.io/mit-license

