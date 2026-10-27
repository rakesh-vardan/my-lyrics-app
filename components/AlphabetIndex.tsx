"use client";

const TELUGU_LETTERS = [
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
  "క", "ఖ", "గ", "ఘ", "చ", "ఛ", "జ", "ఝ", "ట", "ఠ", "డ", "ఢ",
  "ణ", "త", "థ", "ద", "ధ", "న", "ప", "ఫ", "బ", "భ", "మ",
  "య", "ర", "ల", "వ", "శ", "ష", "స", "హ",
];

export default function AlphabetIndex({
  activeLetter,
  onSelect,
}: {
  activeLetter: string;
  onSelect: (letter: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-4">
      <button
        onClick={() => onSelect("")}
        className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
          !activeLetter
            ? "bg-sky-600 text-white"
            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
        }`}
      >
        All
      </button>
      {TELUGU_LETTERS.map((letter) => (
        <button
          key={letter}
          onClick={() => onSelect(activeLetter === letter ? "" : letter)}
          className={`w-8 h-8 rounded text-sm font-medium transition-colors telugu-text ${
            activeLetter === letter
              ? "bg-sky-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
          }`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
