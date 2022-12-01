export function getEnv(val: string) {
  const res = process.env[val];
  if (!res) {
    throw new Error(`failed to get environment variable: ${val}`);
  }

  return res;
}
