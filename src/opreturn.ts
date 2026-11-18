/**
 * OP_RETURN push-data parsing, shared by the live feed.
 *
 * ProofPost stamps have the layout:
 *   OP_RETURN <push "PPST"> <push message-utf8>
 * which is the standard BCH OP_RETURN convention (protocol id first).
 */

const OP_RETURN = 0x6a;
const OP_PUSHDATA1 = 0x4c;
const OP_PUSHDATA2 = 0x4d;

/** Split a script into its data pushes. Returns null if not an OP_RETURN script. */
export function parseOpReturnPushes(script: Uint8Array): Uint8Array[] | null {
  if (script.length === 0 || script[0] !== OP_RETURN) return null;
  const pushes: Uint8Array[] = [];
  let i = 1;
  while (i < script.length) {
    const op = script[i];
    if (op === 0x00) {
      pushes.push(new Uint8Array(0));
      i += 1;
    } else if (op >= 0x01 && op <= 0x4b) {
      pushes.push(script.slice(i + 1, i + 1 + op));
      i += 1 + op;
    } else if (op === OP_PUSHDATA1) {
      const len = script[i + 1];
      pushes.push(script.slice(i + 2, i + 2 + len));
      i += 2 + len;
    } else if (op === OP_PUSHDATA2) {
      const len = script[i + 1] | (script[i + 2] << 8);
      pushes.push(script.slice(i + 3, i + 3 + len));
      i += 3 + len;
    } else {
      // Unknown opcode — stop; whatever we collected is all we can trust.
      break;
    }
  }
  return pushes;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Parse an OP_RETURN script (hex) into UTF-8 pushes.
 * Returns e.g. ["PPST", "hello chain"] or null when it isn't OP_RETURN.
 */
export function parseOpReturnScriptHex(scriptHex: string): string[] | null {
  const pushes = parseOpReturnPushes(hexToBytes(scriptHex));
  if (!pushes) return null;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return pushes.map((p) => decoder.decode(p));
}
