
export const parseTagValue = (tagValue: string): Record<string, string> => {
    const result: Record<string, string> = {};
    // Regex to capture key=value pairs, handling quoted values and nested structures (like JSON) better.
    // It looks for word characters for keys, followed by '=', and then:
    // 1. Double-quoted string (capturing content inside, handling escaped quotes)
    // 2. Single-quoted string (capturing content inside, handling escaped quotes)
    // 3. Unquoted value, which can be a simple value, or a JSON-like object/array ({...} or [...])
    //    This part stops at a comma followed by another key= or at the end of the string.
    const paramRegex = /(\w+(?:\.\w+)*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\{.*?\}|\[.*?\]|[^,]*?)(?=\s*,\s*\w+\s*=|$)))/g;

    let match;
    while ((match = paramRegex.exec(tagValue)) !== null) {
      const key = match[1].trim();
      // Determine the value based on which capture group matched
      let value = match[2] !== undefined ? match[2].replace(/\\"/g, '"') : // Double-quoted
                  match[3] !== undefined ? match[3].replace(/\\'/g, "'") : // Single-quoted
                  match[4] !== undefined ? match[4].trim() : ''; // Unquoted or JSON-like
      result[key] = value;
    }
    return result;
};
