
async function verifyPassword(password, storedHash) {
  try {
    if (!storedHash) return false;

    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);

    if (!Number.isInteger(iterations) ||
        iterations < 10000 ||
        iterations > 1000000) {
      return false;
    }

    const salt = Uint8Array.from(
      atob(parts[2]),
      c => c.charCodeAt(0)
    );

    const expected = Uint8Array.from(
      atob(parts[3]),
      c => c.charCodeAt(0)
    );

    if (salt.length !== 16 || expected.length !== 32) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );

    const actual = new Uint8Array(result);
    let difference = 0;

    for (let i = 0; i < expected.length; i++) {
      difference |= actual[i] ^ expected[i];
    }

    return difference === 0;

  } catch {
    return false;
  }
}
