import { Tag } from "lucide-react";

export function TagFilterWidget({
  tags,
  selectedTag,
  onSelectTag
}: {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="bg-white border-4 border-[#0284c7] p-4 shadow-[6px_6px_0px_0px_#0284c7] rounded-sm">
      <h3 className="font-black text-[#0284c7] uppercase tracking-wider mb-3 border-b-2 border-dashed border-[#0284c7]/30 pb-2 flex items-center gap-2">
        <Tag className="w-4 h-4" /> Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectTag(null)}
          className={`text-xs font-bold px-2 py-1 border-2 rounded-sm transition-colors ${
            selectedTag === null
              ? "bg-[#0284c7] text-white border-[#0284c7] shadow-[2px_2px_0px_0px_#f59e0b]"
              : "bg-[rgba(250,248,245,0.35)] text-[#0284c7] border-[#0284c7]/20 hover:border-[#0284c7] hover:bg-[#fde68a]"
          }`}
        >
          全部
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onSelectTag(tag)}
            className={`text-xs font-bold px-2 py-1 border-2 rounded-sm transition-colors ${
              selectedTag === tag
                ? "bg-[#0ea5e9] text-white border-[#0284c7] shadow-[2px_2px_0px_0px_#0284c7]"
                : "bg-[rgba(250,248,245,0.35)] text-[#0284c7] border-[#0284c7]/20 hover:border-[#0284c7] hover:bg-[#fde68a]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
