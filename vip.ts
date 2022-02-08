import * as flags  from "https://lib.deno.dev/std/flags/mod.ts";
import * as vip from "./mod.ts";

await vip.init();
const args = flags.parse(Deno.args);
const type: vip.Type = args.opt ? "opt" : "start";
const packages = args._.slice(1) as string[];
switch (args._.at(0)) {
  case "add":
    for(const pkg in packages) {
      await vip.add(type, pkg);
    }
    break;
  case "remove":
    for(const pkg in packages) {
      await vip.remove(type, pkg);
    }
    break;
  case "list":
    await vip.list(type);
    break;
  case "sync":
    await vip.sync();
    break;
  default:
    vip.help();
}
