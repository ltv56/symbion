import { hashPassword } from './auth/password-hash';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '');
}

async function main(): Promise<void> {
  const password = process.argv[2] ?? (await readStdin());
  if (!password) {
    console.error('Usage: echo -n "<password>" | pnpm hash-password');
    process.exitCode = 1;
    return;
  }
  console.log(await hashPassword(password));
}

void main();
