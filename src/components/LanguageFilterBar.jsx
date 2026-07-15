import React from "react";
import { LANGUAGE_FILTERS } from "../data/content.js";

export const LanguageFilterBar = ({
  selectedLanguage,
  onChange,
  accent = "blue",
  languages = LANGUAGE_FILTERS
}) => {
  const selectedClasses = accent === "green"
    ? "bg-[#3f6fd9] text-white border-[#3f6fd9]"
    : "bg-[#3f6fd9] text-white border-[#3f6fd9]";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {languages.map(language => (
        <button
          key={language}
          type="button"
          onClick={() => onChange(language)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
            selectedLanguage === language
              ? selectedClasses
              : "bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa] hover:text-[#24292f]"
          }`}
        >
          {language === "All" ? "전체 언어" : language}
        </button>
      ))}
    </div>
  );
};
