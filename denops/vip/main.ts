import { Denops } from "https://lib.deno.dev/x/denops_std@v3/mod.ts";
import * as vip from "../../mod.ts";

export async function main(denops: Denops) {
  await vip.init();
  denops.dispatcher = {
    Add: (pkg) => vip.add("start", pkg as string),
    AddOpt: (pkg) => vip.add("opt", pkg as string),
    Remove: (pkg) => vip.remove("start", pkg as string),
    RemoveOpt: (pkg) => vip.remove("opt", pkg as string),
    List: () => vip.list("start"),
    ListOpt: () => vip.list("opt"),
    Sync: () => vip.sync(),
    Log: () => vip.log(),
    Bundle: () => vip.bundle(),
  };
  denops.cmd(
    `command! -nargs=1 VipAdd call denops#notify('${denops.name}', 'Add', [<q-args>])`,
  );
  denops.cmd(
    `command! -nargs=1 VipAddOpt call denops#notify('${denops.name}', 'AddOpt', [<q-args>])`,
  );
  denops.cmd(
    `command! -nargs=1 VipRemove call denops#notify('${denops.name}', 'Remove', [<q-args>])`,
  );
  denops.cmd(
    `command! -nargs=1 VipRemoveOpt call denops#notify('${denops.name}', 'RemoveOpt', [<q-args>])`,
  );
  denops.cmd(
    `command! VipList call denops#notify('${denops.name}', 'List', [])`,
  );
  denops.cmd(
    `command! VipListOpt call denops#notify('${denops.name}', 'ListOpt', [])`,
  );
  denops.cmd(
    `command! VipSync call denops#notify('${denops.name}', 'Sync', [])`,
  );
  denops.cmd(`command! VipLog call denops#notify('${denops.name}', 'Log', [])`);
  denops.cmd(
    `command! VipBundle call denops#notify('${denops.name}', 'Bundle', [])`,
  );
}
