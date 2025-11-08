import { DIFFICULTIES, PROGRAMMING_LANGUAGES, PROGRAMMING_TOPICS } from "@/constants/constants";

interface MatchingFormFieldsProps {
    formLanguage: string;
    formTopics: string[];
    formDifficulty: string;
    isFormDisabled: boolean;
    handleSetFormLanguage: (lang: string) => void;
    handleSetFormTopics: (topics: string[]) => void;
    handleSetFormDifficulty: (diff: string) => void;
}

export default function MatchingFormFields({
    formLanguage,
    formTopics,
    formDifficulty,
    isFormDisabled,
    handleSetFormLanguage,
    handleSetFormTopics,
    handleSetFormDifficulty,
}: MatchingFormFieldsProps) {
    const toggleTopic = (topic: string) => {
        const newTopics = formTopics.includes(topic)
            ? formTopics.filter((t) => t !== topic)
            : [...formTopics, topic];
        handleSetFormTopics(newTopics); 
    };
    
    return (
        <fieldset
            disabled={isFormDisabled}
            className={isFormDisabled ? "opacity-60 transition-opacity" : ""}
            >
            {/* Programming Language selection */}
            <div className="mb-6">
                <label className="block text-lg font-medium text-gray-800 mb-1">
                    1. Select Programming Language
                </label>
                <select
                id="language-select"
                value={formLanguage}
                onChange={(e) => handleSetFormLanguage(e.target.value)}
                className={`w-full appearance-none border border-gray-300 bg-white rounded-xl py-3 px-4 shadow-md 
                            transition duration-150 ease-in-out focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none 
                            text-gray-800 cursor-pointer
                            ${
                            isFormDisabled
                                ? "bg-gray-200 cursor-not-allowed"
                                : ""
                            }`}
                >
                    {PROGRAMMING_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. Topics selection */}
            <div className="mb-6">
                <label className="block text-lg font-medium text-gray-800 mb-2">
                2. Topics (Select one or more)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-300 rounded-xl shadow-sm">
                    {PROGRAMMING_TOPICS.map((topic) => (
                        <button
                            key={topic}
                            onClick={() => toggleTopic(topic)}
                            type="button"
                            disabled={isFormDisabled}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 
                                        ${
                                        formTopics.includes(topic)
                                            ? "bg-blue-500 text-white shadow-md"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                        }
                                        ${
                                        isFormDisabled
                                            ? "cursor-not-allowed"
                                            : ""
                                        }`}
                            >
                            {topic}
                        </button>
                    ))}
                </div>
                {formTopics.length === 0 && !isFormDisabled && (
                    <p className="text-sm text-red-500 mt-2">
                        Please select at least one topic.
                    </p>
                )}
            </div>

            {/* Difficulty selection */}
            <div className="mb-6">
                <label className="block text-lg font-medium text-gray-800 mb-2">
                3. Select Difficulty Level
                </label>
                <div className="flex space-x-3 p-3 bg-white border border-gray-300 rounded-xl shadow-sm">
                {DIFFICULTIES.map((diff) => (
                    <button
                    key={diff}
                    onClick={() => handleSetFormDifficulty(diff)}
                    type="button"
                    className={`flex-1 py-3 text-base font-semibold rounded-lg transition-all duration-200 border-2
                                            ${
                                            diff === formDifficulty
                                                ? "bg-blue-500 text-white shadow-md border-blue-500"
                                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                            }
                                            ${
                                            isFormDisabled
                                                ? "cursor-not-allowed"
                                                : ""
                                            }`}
                    >
                    {diff}
                    </button>
                ))}
                </div>
            </div>
        </fieldset>
    )
}