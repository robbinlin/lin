"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`/library?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="search"
        placeholder="搜尋標題、摘要、內容、網址…（例如搜尋網域可以一次找出同來源的連結）"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        搜尋
      </button>
    </form>
  );
}
