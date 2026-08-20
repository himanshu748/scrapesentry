"use client";

import { CheckCircle, CopySimple } from "@phosphor-icons/react";
import { useState } from "react";

export function CopyCodeButton({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <button className="copy-code-button" type="button" onClick={copy}>
      {state === "copied" ? <CheckCircle size={14} weight="fill" /> : <CopySimple size={14} />}
      {state === "copied" ? "Copied" : state === "failed" ? "Select manually" : "Copy"}
    </button>
  );
}
