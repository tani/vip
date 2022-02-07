const targets = [
  "x86_64-unknown-linux-gnu",
  "x86_64-pc-windows-msvc",
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
];

await Promise.all(targets.map((target) => {
  const p = Deno.run({
    cmd: [
      "deno",
      "compile",
      "--target",
      target,
      "--output",
      `dist/vip-${target}`,
      "vip.ts",
    ],
  });
  return p.status();
}));
