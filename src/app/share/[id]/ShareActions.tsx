"use client";

export function CopyLinkButton() {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(window.location.href)}
      className="btn-ghost text-sm py-2 px-4"
    >
      Copy link
    </button>
  );
}
